import { getAuth, signOut } from 'firebase/auth';
import '../firebase';
export async function signOutUser() { await signOut(getAuth()); }