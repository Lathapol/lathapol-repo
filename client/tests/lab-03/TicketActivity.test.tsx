import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import TicketActivity from '../../src/components/TicketActivity'
import {fetchActions,fetchEntries,fetchOwners,postEntry,updateWorkflow,appearsResolved} from '../../src/api'
import type {TicketDetail} from '../../src/api'
vi.mock('../../src/api',()=>({fetchActions:vi.fn().mockResolvedValue([]),fetchEntries:vi.fn(),fetchOwners:vi.fn(),postEntry:vi.fn(),updateWorkflow:vi.fn(),appearsResolved:vi.fn()}))
const ticket:TicketDetail={id:1,ticketNumber:'TK1',summary:'Broken printer',description:'Printer is unavailable',category:'Hardware',relatedSystem:'Printing',requestedPriority:'LOW',itPriority:'HIGH',currentStatus:'OPEN',version:3,ownerId:null,owner:null,requester:{name:'Jane'},createdAt:'2026-01-01',updatedAt:'2026-01-01',attachments:[]}
beforeEach(()=>{vi.mocked(fetchActions).mockResolvedValue([]);vi.mocked(fetchEntries).mockResolvedValue([]);vi.mocked(fetchOwners).mockResolvedValue([]);vi.mocked(updateWorkflow).mockResolvedValue({});vi.mocked(appearsResolved).mockResolvedValue({})})
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('requires confirmation for resolution and sends expected version',async()=>{
  const refresh=vi.fn();render(<TicketActivity ticket={ticket} role="IT_STAFF" onRefresh={refresh}/>);
  fireEvent.change(screen.getByLabelText('Change status'),{target:{value:'RESOLVED'}})
  expect(screen.getByRole('button',{name:'Save changes'})).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Confirm changing status to RESOLVED'))
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}))
  await waitFor(()=>expect(updateWorkflow).toHaveBeenCalledWith(1,{version:3,currentStatus:'RESOLVED',confirmed:true}))
  expect(refresh).toHaveBeenCalled()
})
it('shows stale conflict without silently overwriting',async()=>{
  vi.mocked(updateWorkflow).mockRejectedValue(new Error('This ticket changed. Reload it before saving again.'))
  render(<TicketActivity ticket={ticket} role="IT_STAFF" onRefresh={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Claim ticket'}))
  expect(await screen.findByText(/This ticket changed/)).toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Reload ticket'})).toBeEnabled()
  expect(updateWorkflow).toHaveBeenCalledTimes(1)
})
it('requester can signal and comment without fetching or displaying notes',async()=>{
  render(<TicketActivity ticket={ticket} role="REQUESTER" onRefresh={vi.fn()}/>);
  await screen.findByText('No public comments yet.')
  expect(fetchEntries).toHaveBeenCalledWith(1,'comments');expect(fetchEntries).not.toHaveBeenCalledWith(1,'notes')
  expect(screen.queryByText('Internal Notes')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Change status')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'This appears resolved'}))
  await waitFor(()=>expect(appearsResolved).toHaveBeenCalledWith(1))
})
it('administrator can read both conversations but has no composers or workflow mutations',async()=>{
  render(<TicketActivity ticket={ticket} role="ADMINISTRATOR" onRefresh={vi.fn()}/>);
  await screen.findByText('No internal notes yet.')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Save changes'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'This appears resolved'})).not.toBeInTheDocument()
})
it('keeps failed comment text and renders successful plain text safely',async()=>{
  vi.mocked(postEntry).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({id:7,body:'<script>hello</script>',author:{id:2,name:'Jane'},createdAt:'2026-01-01'})
  const {container}=render(<TicketActivity ticket={ticket} role="REQUESTER" onRefresh={vi.fn()}/>);
  await screen.findByText('No public comments yet.')
  fireEvent.change(screen.getByLabelText('New public comment'),{target:{value:'<script>hello</script>'}})
  fireEvent.click(screen.getByRole('button',{name:'Post comment'}))
  await screen.findByText(/Your text is kept/)
  expect(screen.getByLabelText('New public comment')).toHaveValue('<script>hello</script>')
  fireEvent.click(screen.getByRole('button',{name:'Post comment'}))
  await screen.findByText('Comment posted.')
  expect(container.querySelector('script')).toBeNull()
  expect(screen.getByLabelText('New public comment')).toHaveValue('')
})
