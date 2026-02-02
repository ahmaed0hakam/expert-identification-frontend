import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminNavComponent } from '../../../../shared/components/admin-nav/admin-nav.component';
import { AdminHeaderComponent } from '../../../../shared/components/admin-header/admin-header.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { DropdownComponent, DropdownOption } from '../../../../shared/components/dropdown/dropdown.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { firstValueFrom } from 'rxjs';
import { ROLES } from '@/app/shared/constants/roles';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  display_name?: string;
  role: string;
  emailVerified?: boolean;
  email_verified?: boolean;
  creationTime?: number;
  lastSignInTime?: number;
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, IconComponent, DropdownComponent, ConfirmModalComponent],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.css']
})
export class ManageUsersComponent implements OnInit {

  apiService = inject(ApiService);
  authService = inject(AuthService);
  router = inject(Router);
  translate = inject(TranslateService);
  toastService = inject(ToastService);

  users: User[] = [];
  isLoading = false;
  showCreateForm = false;
  
  // Create user form
  newUser = {
    email: '',
    password: '',
    role: 'user',
    display_name: ''
  };
  
  isCreating = false;

  currentUserUid: string | null = null;

  // Confirmation modal
  showDeleteConfirm = false;
  userToDelete: User | null = null;
  deleteConfirmTitle = '';
  deleteConfirmMessage = '';

  readonly roles = ROLES;

  // Role options for dropdown
  roleOptions: DropdownOption[] = [
    { value: ROLES.USER, label: this.translate.instant('admin.userRole') },
    { value: ROLES.ADMIN, label: this.translate.instant('admin.adminRole') }
  ];

  ngOnInit() {
    // Get current user UID to filter it out
    const user = this.authService.getCurrentUserSync();
    this.currentUserUid = user?.uid || null;
    
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      const response = await this.apiService.listUsers().toPromise();
      let allUsers = response?.users || [];
      
      // Filter out current user (double check on frontend for safety)
      if (this.currentUserUid) {
        allUsers = allUsers.filter((user: User) => {
          const shouldInclude = user.uid !== this.currentUserUid;
          if (!shouldInclude) {
          }
          return shouldInclude;
        });
      }
      
      this.users = allUsers;
      
      if (this.users.length === 0) {
        // No users found, but that's okay
        console.log('No users found');
      }
    } catch (error: any) {
      console.error('Failed to load users:', error);
      firstValueFrom(this.translate.get('errors.loadFailed')).then((msg: string) => {
        this.toastService.error(error.error?.detail || msg);
      });
    } finally {
      this.isLoading = false;
    }
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.resetForm();
  }

  resetForm() {
    this.newUser = {
      email: '',
      password: '',
      role: 'user',
      display_name: ''
    };
  }

  async createUser() {
    // Validate required fields with specific error messages
    const email = (this.newUser.email || '').trim();
    const password = (this.newUser.password || '').trim();

    if (!email) {
      const msg = await firstValueFrom(this.translate.get('errors.enterEmail'));
      this.toastService.error(msg);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const msg = await firstValueFrom(this.translate.get('errors.invalidEmail'));
      this.toastService.error(msg);
      return;
    }

    if (!password) {
      const msg = await firstValueFrom(this.translate.get('errors.enterPassword'));
      this.toastService.error(msg);
      return;
    }

    if (password.length < 6) {
      const msg = await firstValueFrom(this.translate.get('errors.passwordTooShort'));
      this.toastService.error(msg);
      return;
    }

    this.isCreating = true;

    try {
      const result = await this.apiService.createUser({
        email: email,
        password: password,
        role: this.newUser.role,
        display_name: this.newUser.display_name?.trim() || undefined
      }).toPromise();

      firstValueFrom(this.translate.get('admin.userCreated')).then((msg: string) => {
        this.toastService.success(msg);
      });
      
      this.resetForm();
      this.showCreateForm = false;
      this.loadUsers();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      firstValueFrom(this.translate.get('errors.createFailed')).then((msg: string) => {
        this.toastService.error(error.error?.detail || msg);
      });
    } finally {
      this.isCreating = false;
    }
  }

  onRoleChange(value: string | number) {
    this.newUser.role = value as string;
  }

  onUserRoleChange(user: User, value: string | number) {
    const newRole = value as string;
    this.updateRole(user, newRole);
  }

  async updateRole(user: User, newRole: string) {
    if (user.role === newRole) return;

    try {
      await this.apiService.updateUserRole(user.uid, newRole).toPromise();
      firstValueFrom(this.translate.get('admin.userRoleUpdated')).then((msg: string) => {
        this.toastService.success(msg);
      });
      this.loadUsers();
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      firstValueFrom(this.translate.get('errors.updateUserFailed')).then((msg: string) => {
        this.toastService.error(error.error?.detail || msg);
      });
    }
  }

  async deleteUser(user: User) {
    this.userToDelete = user;
    
    // Get translated messages
    const deleteText = await firstValueFrom(this.translate.get('common.delete'));
    const userText = await firstValueFrom(this.translate.get('admin.userRole'));
    this.deleteConfirmTitle = `${deleteText} ${userText}`;
    
    const messageTemplate = await firstValueFrom(this.translate.get('admin.deleteUserConfirm'));
    this.deleteConfirmMessage = messageTemplate.replace('{{email}}', user.email);
    this.showDeleteConfirm = true;
  }

  async confirmDelete() {
    if (!this.userToDelete) return;

    try {
      await this.apiService.deleteUser(this.userToDelete.uid).toPromise();
      firstValueFrom(this.translate.get('admin.userDeleted')).then((msg: string) => {
        this.toastService.success(msg);
      });
      this.loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      firstValueFrom(this.translate.get('errors.deleteUserFailed')).then((msg: string) => {
        this.toastService.error(error.error?.detail || msg);
      });
    } finally {
      this.closeDeleteConfirm();
    }
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
    this.deleteConfirmTitle = '';
    this.deleteConfirmMessage = '';
  }
}
