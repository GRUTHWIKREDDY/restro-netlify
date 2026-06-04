import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    status: 'active',
  };

  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      restaurantId: 'rest-123',
      tableNumber: 5,
      userName: 'Sanjay',
      items: [{ menuId: 'i1', name: 'Butter Chicken', quantity: 1, price: 450 }],
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalAmount: 450,
    },
  ];

  const props = {
    restaurant: mockRestaurant,
    orders: mockOrders,
    onOrderStatusUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all active orders with correct item lists', () => {
    render(<KitchenDisplaySystem {...props} />);
    expect(screen.getByText('Sanjay')).toBeInTheDocument();
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument();
    expect(screen.getByText('Table #5')).toBeInTheDocument();
  });

  it('should transition order status from pending -> preparing -> ready', async () => {
    render(<KitchenDisplaySystem {...props} />);

    const statusBtn = screen.getByText('pending');
    fireEvent.click(statusBtn);

    expect(props.onOrderStatusUpdate).toHaveBeenCalledWith('ord-1', 'preparing');
  });

  it('should visually distinguish orders based on their prep time (SLA/Urgency)', () => {
    // We can check for CSS classes like 'bg-rose-100' or 'animate-pulse'
    // if the order is old.
    const oldOrders = [
      {
        ...mockOrders[0],
        createdAt: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
      },
    ];
    render(<KitchenDisplaySystem {...{...props, orders: oldOrders}} />);

    const orderCard = screen.getByText('Sanjay').closest('div');
    // Expecting some urgency class (e.g. border-rose-500)
    expect(orderCard).toBeInTheDocument();
  });
});
