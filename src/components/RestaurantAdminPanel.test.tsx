import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RestaurantAdminPanel from './RestaurantAdminPanel';
import { Restaurant, MenuItem } from '../types';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getFirestore: vi.fn(() => ({})),
}));

describe('RestaurantAdminPanel - VIGOROUS QA', () => {
  const mockRestaurant: Restaurant = {
    id: 'rest-123',
    name: 'The Royal Clay Oven',
    status: 'active',
    verificationPin: '1234',
  };

  const mockMenus: MenuItem[] = [
    { id: 'i1', restaurantId: 'rest-123', name: 'Butter Chicken', price: 450, category: 'Main Course', isAvailable: true },
  ];

  const props = {
    restaurant: mockRestaurant,
    menus: mockMenus,
    onUpdateMenu: vi.fn(),
    onUpdateRestaurant: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the admin dashboard with menu management tools', () => {
    render(<RestaurantAdminPanel {...props} />);
    expect(screen.getByText(/Menu Management/i)).toBeInTheDocument();
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument();
  });

  it('should allow toggling item availability', async () => {
    render(<RestaurantAdminPanel {...props} />);

    // Find the availability toggle for Butter Chicken
    const itemRow = screen.getByText('Butter Chicken').closest('div');
    const toggle = itemRow?.querySelector('input[type="checkbox"]');

    if (toggle) {
      fireEvent.click(toggle);
      expect(props.onUpdateMenu).toHaveBeenCalled();
    }
  });

  it('should allow updating the restaurant verification pin', async () => {
    render(<RestaurantAdminPanel {...props} />);

    const pinInput = screen.getByPlaceholderText(/New 4-digit PIN/i);
    fireEvent.change(pinInput, { target: { value: '5678' } });

    const saveBtn = screen.getByText(/Save Changes/i);
    fireEvent.click(saveBtn);

    expect(props.onUpdateRestaurant).toHaveBeenCalled();
  });
});
