import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {

  test.describe('1. Restaurant API', () => {
    test('GET /api/restaurants should return restaurant list', async ({ request }) => {
      const response = await request.get('/api/restaurants');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
      
      // Check first restaurant structure
      const first = data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('status');
    });

    test('POST /api/restaurants should update restaurant', async ({ request }) => {
      // First get existing restaurants
      const getRes = await request.get('/api/restaurants');
      const restaurants = await getRes.json();
      
      const restaurant = restaurants[0];
      
      // Update and send back
      const response = await request.post('/api/restaurants', {
        data: restaurant
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.restaurants).toBeTruthy();
    });
  });

  test.describe('2. Menu API', () => {
    test('GET /api/menus should return menu items', async ({ request }) => {
      const response = await request.get('/api/menus');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
      
      const first = data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('price');
      expect(first).toHaveProperty('restaurantId');
    });

    test('POST /api/menus should create/update menu item', async ({ request }) => {
      const newItem = {
        id: 'menu-test-1',
        restaurantId: 'rest-1',
        name: 'Test Item',
        description: 'Test description',
        price: 100,
        category: 'Test',
        isAvailable: true,
        isLimitedTimeOffer: false,
        offerDetails: '',
        promoValue: 0
      };
      
      const response = await request.post('/api/menus', {
        data: newItem
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('3. Orders API', () => {
    test('GET /api/orders should return orders list', async ({ request }) => {
      const response = await request.get('/api/orders');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      // API may return array directly or wrapped in {orders: []}
      const orders = Array.isArray(data) ? data : data.orders;
      expect(Array.isArray(orders)).toBeTruthy();
    });

    test('POST /api/orders should create/update order', async ({ request }) => {
      const newOrder = {
        id: 'ord-test-1',
        restaurantId: 'rest-1',
        tableNumber: 1,
        userPhone: '+919999999999',
        userName: 'Test User',
        items: [
          { menuId: 'menu-1', name: 'Butter Chicken', quantity: 1, price: 380, promoValue: 57 }
        ],
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalAmount: 323
      };
      
      const response = await request.post('/api/orders', {
        data: newOrder
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('4. Users API', () => {
    test('GET /api/users should return users list', async ({ request }) => {
      const response = await request.get('/api/users');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('POST /api/users should create/update user', async ({ request }) => {
      const newUser = {
        phone: '+919999999999',
        name: 'Test Customer',
        globalOrderHistory: []
      };
      
      const response = await request.post('/api/users', {
        data: newUser
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('5. Auth API', () => {
    test('POST /api/auth/merchant-login should validate credentials', async ({ request }) => {
      const createRes = await request.post('/api/admin/create-staff', {
        data: {
          email: 'test-admin@test.com',
          password: 'testpass123',
          role: 'restadmin',
          restaurantId: 'rest-1'
        }
      });
      expect(createRes.ok()).toBeTruthy();
      
      const response = await request.post('/api/auth/merchant-login', {
        data: {
          email: 'test-admin@test.com',
          password: 'testpass123',
          role: 'restadmin',
          restaurantId: 'rest-1'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.role).toBe('restadmin');
      expect(data.restaurantId).toBe('rest-1');
    });

    test('POST /api/auth/merchant-login should reject wrong password', async ({ request }) => {
      const response = await request.post('/api/auth/merchant-login', {
        data: {
          email: 'test-admin@test.com',
          password: 'wrongpassword',
          role: 'restadmin',
          restaurantId: 'rest-1'
        }
      });
      
      expect(response.ok()).toBeFalsy();
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    test('POST /api/auth/merchant-login should reject non-existent user', async ({ request }) => {
      const response = await request.post('/api/auth/merchant-login', {
        data: {
          email: 'nonexistent@email.com',
          password: 'password',
          role: 'restadmin',
          restaurantId: 'rest-1'
        }
      });
      
      expect(response.ok()).toBeFalsy();
    });
  });

  test.describe('6. Admin Staff Management API', () => {
    test('GET /api/admin/get-staff/:restaurantId should return staff list', async ({ request }) => {
      const response = await request.get('/api/admin/get-staff/rest-1');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.staff)).toBeTruthy();
    });

    test('POST /api/admin/create-staff should create staff credentials', async ({ request }) => {
      const response = await request.post('/api/admin/create-staff', {
        data: {
          email: 'test-staff@test.com',
          password: 'testpass123',
          role: 'restadmin',
          restaurantId: 'rest-1'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('7. Buzzer API', () => {
    test('GET /api/buzzers should return buzzer list', async ({ request }) => {
      const response = await request.get('/api/buzzers');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      // API may return array directly or wrapped in {buzzers: []}
      const buzzers = Array.isArray(data) ? data : data.buzzers;
      expect(Array.isArray(buzzers)).toBeTruthy();
    });
  });

  test.describe('8. Reset API', () => {
    test('POST /api/reset should reset database', async ({ request }) => {
      const response = await request.post('/api/reset');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.message).toBeTruthy();
    });
  });
});
