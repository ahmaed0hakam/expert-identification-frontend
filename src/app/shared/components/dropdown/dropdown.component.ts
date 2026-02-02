import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.css']
})
export class DropdownComponent {
  @Input() options: DropdownOption[] = [];
  @Input() selectedValue: string | number | null = null;
  @Input() placeholder: string = 'Select an option';
  @Input() disabled: boolean = false;
  @Input() label: string = '';
  @Input() error: boolean = false;
  @Input() errorMessage: string = '';
  @Input() showClear: boolean = false;
  @Output() selectionChange = new EventEmitter<string | number>();

  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef<HTMLDivElement>;
  @ViewChild('dropdownTrigger') dropdownTrigger!: ElementRef<HTMLDivElement>;

  isOpen = false;
  searchTerm = '';

  get selectedOption(): DropdownOption | null {
    if (this.selectedValue === null || this.selectedValue === undefined) {
      return null;
    }
    return this.options.find(opt => opt.value === this.selectedValue) || null;
  }

  get displayText(): string {
    return this.selectedOption?.label || this.placeholder;
  }

  get filteredOptions(): DropdownOption[] {
    if (!this.searchTerm) {
      return this.options;
    }
    const term = this.searchTerm.toLowerCase();
    return this.options.filter(opt => 
      opt.label.toLowerCase().includes(term)
    );
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.isOpen && 
        this.dropdownTrigger && 
        !this.dropdownTrigger.nativeElement.contains(event.target as Node) &&
        this.dropdownMenu &&
        !this.dropdownMenu.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey() {
    if (this.isOpen) {
      this.closeDropdown();
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchTerm = '';
      // Focus search input if available
      setTimeout(() => {
        const searchInput = this.dropdownMenu?.nativeElement?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
  }

  closeDropdown() {
    this.isOpen = false;
    this.searchTerm = '';
  }

  selectOption(option: DropdownOption) {
    if (option.disabled) return;
    
    this.selectedValue = option.value;
    this.selectionChange.emit(option.value);
    this.closeDropdown();
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
  }

  clearSelection(event: Event) {
    event.stopPropagation();
    this.selectedValue = null;
    this.selectionChange.emit(null as any);
  }

  trackByValue(index: number, option: DropdownOption): string | number {
    return option.value;
  }
}
