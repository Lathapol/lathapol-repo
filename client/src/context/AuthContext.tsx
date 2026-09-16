import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authRequest, setCsrfToken } from '../api'

export interface User { id:number; name:string; email:string; role:'REQUESTER'|'IT_STAFF'|'ADMINISTRATOR'; mustChangePassword:boolean; isActive:boolean }
interface AuthResult { user:User; csrfToken:string }
const Context=createContext<{user:User|null; loading:boolean; error:string; refresh:()=>Promise<void>; login:(email:string,password:string)=>Promise<void>; change:(currentPassword:string,newPassword:string,confirmPassword:string)=>Promise<void>; logout:()=>Promise<void>}|null>(null)
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  function accept(result:AuthResult) {setCsrfToken(result.csrfToken);setUser(result.user)}
  async function refresh() {
    setLoading(true);setError('')
    try {accept(await authRequest('/me'))} catch(error) {
      setUser(null);setCsrfToken('')
      if (!(error instanceof Error && 'status' in error && error.status===401)) setError('Unable to check your session. Please retry.')
    } finally {setLoading(false)}
  }
  useEffect(()=>{
    void refresh()
    const expired=()=>{setUser(null);setCsrfToken('');setError('')}
    const restricted=()=>{void refresh()}
    window.addEventListener('session-expired',expired);window.addEventListener('password-required',restricted)
    return ()=>{window.removeEventListener('session-expired',expired);window.removeEventListener('password-required',restricted)}
  },[])
  async function login(email:string,password:string){accept(await authRequest('/login',{email,password}))}
  async function change(currentPassword:string,newPassword:string,confirmPassword:string){accept(await authRequest('/change-password',{currentPassword,newPassword,confirmPassword}))}
  async function logout(){await authRequest('/logout',{});setUser(null);setCsrfToken('')}
  return <Context.Provider value={{user,loading,error,refresh,login,change,logout}}>{children}</Context.Provider>
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider required');return value}
