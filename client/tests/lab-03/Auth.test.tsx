import {afterEach,describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import App from '../../src/App'
import {AuthProvider} from '../../src/context/AuthContext'
const user={id:7,name:'Jennifer',email:'j@example.com',role:'REQUESTER',isActive:true,mustChangePassword:true}
afterEach(()=>{cleanup();vi.restoreAllMocks()})
describe('Authentication screens',()=>{
  it('restores a restricted session and blocks requester navigation until password change',async()=>{
    const calls=vi.spyOn(global,'fetch').mockImplementation(async(url,options)=>{
      if(String(url).endsWith('/auth/me'))return new Response(JSON.stringify({user,csrfToken:'before'}));
      if(String(url).endsWith('/auth/change-password'))return new Response(JSON.stringify({user:{...user,mustChangePassword:false},csrfToken:'after'}));
      if(String(url).includes('/api/tickets'))return new Response(JSON.stringify({data:[],meta:{page:1,pageSize:10,totalCount:0,totalPages:1}}));
      if(String(url).includes('/api/categories'))return new Response('[]');
      throw new Error('Unexpected request '+String(url)+options?.method)
    })
    render(<AuthProvider><App/></AuthProvider>)
    expect(await screen.findByRole('heading',{name:'Change your initial password'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'My Tickets'})).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Current password'),{target:{value:'Initial password 123'}})
    fireEvent.change(screen.getByLabelText('New password'),{target:{value:'New password 456'}})
    fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'Mismatch'}})
    fireEvent.click(screen.getByRole('button',{name:'Change password'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('matching confirmation')
    fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'New password 456'}})
    fireEvent.click(screen.getByRole('button',{name:'Change password'}))
    expect(await screen.findByRole('heading',{name:'My Tickets'})).toBeInTheDocument()
    const sent=calls.mock.calls.find(([url])=>String(url).endsWith('/auth/change-password'))!
    expect(sent[1]?.credentials).toBe('include');expect(new Headers(sent[1]?.headers).get('X-CSRF-Token')).toBe('before')
  })
  it('shows login after expiry and preserves email after rejected login',async()=>{
    vi.spyOn(global,'fetch').mockImplementation(async()=>new Response(JSON.stringify({error:{code:'INVALID_CREDENTIALS',message:'Email or password is incorrect.'}}),{status:401}))
    render(<AuthProvider><App/></AuthProvider>)
    await screen.findByRole('button',{name:'Sign in'})
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'j@example.com'}})
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'wrong'}})
    fireEvent.click(screen.getByRole('button',{name:'Sign in'}))
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.'))
    expect(screen.getByLabelText('Email')).toHaveValue('j@example.com')
  })
})
