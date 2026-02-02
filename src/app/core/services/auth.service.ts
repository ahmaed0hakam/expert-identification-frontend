import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ROLES } from '@/app/shared/constants/roles';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private firebaseApp: any;
  private firebaseAuth: any;
  private accessToken: string | null = null;
  private userRole: string | null = ROLES.GUEST;
  private currentUserData: any = null;

  constructor(private apiService: ApiService) {
    this.initializeFirebase();
    // Restore auth state from localStorage on initialization
    this.restoreAuthState();
  }

  private restoreAuthState(): void {
    // Restore token and role from localStorage
    this.accessToken = localStorage.getItem('access_token');
    const savedRole = localStorage.getItem('user_role');
    if (savedRole) {
      this.userRole = savedRole;
    } else {
      this.userRole = 'user';  // Default only if nothing in localStorage
    }
    
    // Restore user data if available
    const uid = localStorage.getItem('user_uid');
    const email = localStorage.getItem('user_email');
    if (uid && email && this.userRole) {
      this.currentUserData = {
        uid,
        email,
        role: this.userRole
      };
      this.currentUserSubject.next(this.currentUserData);
    }
  }

  private initializeFirebase() {
    const firebaseConfig = {
      apiKey: environment.firebase.apiKey,
      authDomain: environment.firebase.authDomain,
      projectId: environment.firebase.projectId
    };
    
    this.firebaseApp = initializeApp(firebaseConfig);
    this.firebaseAuth = getAuth(this.firebaseApp);
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.firebaseAuth,
        email,
        password
      );
      
      const idToken = await userCredential.user.getIdToken();
      
      if (!idToken) {
        return false;
      }
      
      // Verify with backend and get JWT
      const response = await this.apiService.verifyFirebaseToken(idToken).toPromise();
      
      if (response) {
        this.accessToken = response.access_token;
        this.userRole = response.role;
        this.currentUserData = {
          uid: response.uid || userCredential.user.uid,
          email: response.email,
          role: response.role
        };
        this.currentUserSubject.next(this.currentUserData);
        
        // Store token
        if (this.accessToken) {
          localStorage.setItem('access_token', this.accessToken);
        }
        if (this.userRole) {
          localStorage.setItem('user_role', this.userRole);
        }
        if (this.currentUserData?.uid) {
          localStorage.setItem('user_uid', this.currentUserData.uid);
          localStorage.setItem('user_email', this.currentUserData.email);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Sign out from Firebase
      await signOut(this.firebaseAuth);
    } catch (error) {
      console.error('Firebase sign out error:', error);
      // Continue with logout even if Firebase sign out fails
    }
    
    // Clear local state
    // Note: For stateless JWT tokens, clearing local storage is sufficient.
    // No backend API call is needed unless your backend tracks sessions server-side.
    this.accessToken = null;
    this.userRole = 'user';
    this.currentUserData = null;
    this.currentUserSubject.next(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('user_email');
    sessionStorage.clear(); // Clear session storage as well
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('access_token');
      if (!this.userRole) {
        this.userRole = localStorage.getItem('user_role') || 'user';
      }
    }
    return this.accessToken;
  }

  getUserRole(): string {
    if (!this.userRole) {
      this.userRole = localStorage.getItem('user_role') || 'user';
    }
    return this.userRole;
  }

  isAuthenticated(): boolean {
    // Check both accessToken and localStorage to ensure consistency
    const token = this.accessToken || localStorage.getItem('access_token');
    return !!token;
  }

  isAdmin(): boolean {
    return this.getUserRole() === ROLES.ADMIN;
  }

  getCurrentUser(): Observable<any> {
    return this.currentUser$;
  }

  getCurrentUserSync(): any {
    // Return current user data synchronously
    if (this.currentUserData) {
      return this.currentUserData;
    }
    // Try to get from localStorage
    const uid = localStorage.getItem('user_uid');
    const email = localStorage.getItem('user_email');
    const role = localStorage.getItem('user_role');
    if (uid) {
      return { uid, email, role };
    }
    return null;
  }
}