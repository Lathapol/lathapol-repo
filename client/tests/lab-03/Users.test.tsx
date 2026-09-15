import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import Users from '../../src/pages/Users'
import {fetchUsers,saveUser,resetUserPassword} from '../../src/api'
vi.mock('../../src/api',()=>({fetchUsers:vi.fn(),saveUser:vi.fn(),resetUserPassword:vi.fn()}))
const user={id:2,name:'Jane',email:'jane@example.test',role:'REQUESTER' as const,isActive:true,mustChangePassword:false}
beforeEach(()=>{vi.mocked(fetchUsers).mockResolvedValue([user]);vi.mocked(saveUser).mockResolvedValue(user);vi.mocked(resetUserPassword).mockResolvedValue({...user,mustChangePassword:true})})
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('combines name/email search and role filter',async()=>{
  render(<Users currentUserId={1} onSelfChange={vi.fn()}/>);await screen.findAllByText('Jane');
  fireEvent.change(screen.getByLabelText('Search name or email'),{target:{value:'Jane'}});fireEvent.change(screen.getByLabelText('Filter role'),{target:{value:'REQUESTER'}});fireEvent.click(screen.getByRole('button',{name:'Search',exact:true}));
  await waitFor(()=>expect(fetchUsers).toHaveBeenLastCalledWith('Jane','REQUESTER'))
})
it('keeps the create draft after duplicate email and clears password after success',async()=>{
  vi.mocked(saveUser).mockRejectedValueOnce(new Error('This email address is already in use.')).mockResolvedValueOnce(user)
  render(<Users currentUserId={1} onSelfChange={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Create account'}));
  fireEvent.change(screen.getByLabelText(/^Name/),{target:{value:'Jane'}});fireEvent.change(screen.getByLabelText(/^Email/),{target:{value:'jane@example.test'}});fireEvent.change(screen.getByLabelText(/^Initial password/),{target:{value:'Initial password 123!'}});fireEvent.click(screen.getByRole('button',{name:'Create account'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('already in use');expect(screen.getByLabelText(/^Name/)).toHaveValue('Jane');
  fireEvent.click(screen.getByRole('button',{name:'Create account'}));await screen.findByText(/Account created/);expect(screen.queryByLabelText(/^Initial password/)).not.toBeInTheDocument()
})
it('requires deactivation/reset confirmation and clears reset input on success',async()=>{
  render(<Users currentUserId={1} onSelfChange={vi.fn()}/>);fireEvent.click((await screen.findAllByRole('button',{name:'Edit jane@example.test'}))[0]);
  fireEvent.click(screen.getByLabelText('Active account'));expect(screen.getByRole('button',{name:'Save account'})).toBeDisabled();fireEvent.click(screen.getByLabelText(/Confirm deactivation/));expect(screen.getByRole('button',{name:'Save account'})).toBeEnabled();
  fireEvent.change(screen.getByLabelText(/^New initial password/),{target:{value:'New initial password 456!'}});expect(screen.getByRole('button',{name:'Set initial password'})).toBeDisabled();fireEvent.click(screen.getByLabelText(/Confirm password reset/));fireEvent.click(screen.getByRole('button',{name:'Set initial password'}));
  await screen.findByText(/Initial password set/);expect(resetUserPassword).toHaveBeenCalledWith(2,'New initial password 456!');expect(screen.getByLabelText(/^New initial password/)).toHaveValue('')
})
it('disables self-deactivation with a reason',async()=>{
  render(<Users currentUserId={2} onSelfChange={vi.fn()}/>);fireEvent.click((await screen.findAllByRole('button',{name:'Edit jane@example.test'}))[0]);expect(screen.getByLabelText('Active account')).toBeDisabled();expect(screen.getByText('You cannot deactivate your own account.')).toBeInTheDocument()
})
it('shows forbidden feedback and can retry',async()=>{
  vi.mocked(fetchUsers).mockRejectedValueOnce({status:403});render(<Users currentUserId={1} onSelfChange={vi.fn()}/>);expect(await screen.findByRole('alert')).toHaveTextContent('do not have access');fireEvent.click(screen.getByRole('button',{name:'Retry'}));await screen.findAllByText('Jane')
})
