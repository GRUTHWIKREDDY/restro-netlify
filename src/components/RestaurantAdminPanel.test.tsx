import { render, screen, fireEvent } from '@testing-library/react';
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
    logoUrl: 'http://example.com/logo.png',
    status: 'active',
    lockedBySuperAdmin: false,
    totalTables: 8,
    verificationPin: '1234',
  };

  const mockMenus: MenuItem[] = [
    {
      id: 'i1',
      restaurantId: 'rest-123',
      name: 'Butter Chicken',
      description: 'Rich and creamy',
      price: 450,
      category: 'Main Course',
      isAvailable: true,
      isLimitedTimeOffer: false,
      offerDetails: '',
      promoValue: 0
    },
  ];

  const props = {
    restaurant: mockRestaurant,
    restaurants: [mockRestaurant],
    onChangeRestaurantStatus: vi.fn(),
    onUpdateRestaurantPin: vi.fn(),
    menus: mockMenus,
    onMenuItemSave: vi.fn(),
    onMenuItemDelete: vi.fn(),
    orders: [],
    onUpdateOrderStatus: vi.fn(),
    onCancelSpecificDish: vi.fn(),
    onTableUpdate: vi.fn(),
    triggerAppAlert: vi.fn(),
    buzzers: [],
    onSwitchToKitchenMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the admin dashboard with menu management tools', () => {
    render(<RestaurantAdminPanel {...props} activeTab="menu" />);

    expect(screen.getByText(/Menu Items/i)).toBeInTheDocument();
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument();
  });

  it('should allow toggling item availability', async () => {
    render(<RestaurantAdminPanel {...props} activeTab="menu" />);

    // Find the availability toggle button for Butter Chicken
    const toggleBtn = screen.getByRole('button', { name: 'Available' });
    fireEvent.click(toggleBtn);

    expect(props.onMenuItemSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i1', isAvailable: false }),
      true
    );
  });

  it('should allow updating the restaurant verification pin', async () => {
    render(<RestaurantAdminPanel {...props} activeTab="tables" />);

    const pinInput = screen.getByPlaceholderText('1234');
    fireEvent.change(pinInput, { target: { value: '5678' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Key' });
    fireEvent.click(saveBtn);

    expect(props.onUpdateRestaurantPin).toHaveBeenCalledWith('rest-123', '5678');
  });
});
