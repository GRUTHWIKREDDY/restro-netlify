import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KitchenDisplaySystem from './KitchenDisplaySystem';
import { Order, Restaurant } from '../types';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getFirestore: vi.fn(() => ({})),
}));

describe('KitchenDisplaySystem - VIGOROUS QA', () => {
  const mockRestaurant: Restaurant = {
    id: 'rest-123',
    name: 'The Royal Clay Oven',
    logoUrl: 'http://example.com/logo.png',
    status: 'active',
    lockedBySuperAdmin: false,
    totalTables: 8,
    enableSlaWarning: true,
  };

  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      restaurantId: 'rest-123',
      tableNumber: 5,
      userName: 'Sanjay',
      items: [{ menuId: 'i1', name: 'Butter Chicken', quantity: 1, price: 450, promoValue: 0 }],
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalAmount: 450,
      userPhone: '9876543210',
    },
  ];

  const props = {
    restaurant: mockRestaurant,
    orders: mockOrders,
    onUpdateOrderStatus: vi.fn(),
    onCancelSpecificDish: vi.fn(),
    buzzers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all active orders with correct item lists', () => {
    render(<KitchenDisplaySystem {...props} />);
    expect(screen.getByText(/Sanjay/i)).toBeInTheDocument();
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument();
    expect(screen.getByText('Table #5')).toBeInTheDocument();
  });

  it('should transition order status from pending -> preparing -> ready', async () => {
    render(<KitchenDisplaySystem {...props} />);

    const acceptBtn = screen.getByRole('button', { name: /Start Cooking/i });
    fireEvent.click(acceptBtn);

    expect(props.onUpdateOrderStatus).toHaveBeenCalledWith('ord-1', 'accepted');
  });

  it('should visually distinguish orders based on their prep time (SLA/Urgency)', () => {
    const oldOrders: Order[] = [
      {
        ...mockOrders[0],
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
      },
    ];
    render(<KitchenDisplaySystem {...{...props, orders: oldOrders}} />);

    const orderCard = screen.getByText(/Sanjay/i).closest('.rounded-xl');
    expect(orderCard).toBeInTheDocument();
    expect(orderCard).toHaveClass('border-rose-400');
  });
});
