import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// Dynamically resolve backend base URL
const API_BASE_URL = `http://${window.location.hostname}:5000`;
console.log('[Doodh Hisaab PWA] Connecting to backend at:', API_BASE_URL);

// Request helper
const fetchFromBackend = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

export default function App() {
  // Navigation / Auth States
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('email') || '';
  });
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'delivery_staff' | 'admin'>(() => {
    return (localStorage.getItem('role') as any) || 'customer';
  });
  const [currentTab, setCurrentTab] = useState<'home' | 'subscribe' | 'logs' | 'calendar' | 'billing'>('home');
  
  // Custom Alert / Confirm states
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Hardcoded credentials for each role
  const CREDENTIALS = {
    admin: { email: 'admin@doodhfarm.com', password: 'admin@123' },
    customer: { email: 'customer@doodhfarm.com', password: 'milk@123' },
    delivery_staff: { email: 'driver@doodhfarm.com', password: 'driver@123' },
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Live Rates States
  const [cowRate, setCowRate] = useState('60.00');
  const [buffaloRate, setBuffaloRate] = useState('72.00');
  const [buffaloPremiumRate, setBuffaloPremiumRate] = useState('80.00');
  const [updatingRates, setUpdatingRates] = useState<Record<string, boolean>>({});

  // Application States
  const [walletBalance, setWalletBalance] = useState('500');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  // Admin Workspace States
  const [adminTab, setAdminTab] = useState<'dashboard' | 'customers' | 'entries' | 'billing' | 'marketplace' | 'quick_entry'>(() => {
    return (localStorage.getItem('adminTab') as any) || 'dashboard';
  });
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);

  // Admin Forms / Modals States
  const [isAddCustOpen, setIsAddCustOpen] = useState(false);
  const [isEditCustOpen, setIsEditCustOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);

  // Add customer inputs
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<'monthly' | 'prepaid'>('monthly');
  const [newCustBuffaloTier, setNewCustBuffaloTier] = useState<'standard' | 'premium'>('standard');
  const [newCustCowRate, setNewCustCowRate] = useState('');
  const [newCustCowMorningQty, setNewCustCowMorningQty] = useState('');
  const [newCustCowEveningQty, setNewCustCowEveningQty] = useState('');
  const [newCustBuffaloRate, setNewCustBuffaloRate] = useState('');
  const [newCustBuffaloMorningQty, setNewCustBuffaloMorningQty] = useState('');
  const [newCustBuffaloEveningQty, setNewCustBuffaloEveningQty] = useState('');
  const [newCustBalance, setNewCustBalance] = useState('');

  // Legacy states kept for safety / backward compatibility
  const [newCustMilkType, setNewCustMilkType] = useState<'cow' | 'buffalo'>('cow');
  const [newCustRate, setNewCustRate] = useState('');
  const [newCustMorningQty, setNewCustMorningQty] = useState('');
  const [newCustEveningQty, setNewCustEveningQty] = useState('');

  // Edit customer inputs
  const [editCustName, setEditCustName] = useState('');
  const [editCustMobile, setEditCustMobile] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustType, setEditCustType] = useState<'monthly' | 'prepaid'>('monthly');
  const [editCustBuffaloTier, setEditCustBuffaloTier] = useState<'standard' | 'premium'>('standard');
  const [editCustCowRate, setEditCustCowRate] = useState('');
  const [editCustCowMorningQty, setEditCustCowMorningQty] = useState('');
  const [editCustCowEveningQty, setEditCustCowEveningQty] = useState('');
  const [editCustBuffaloRate, setEditCustBuffaloRate] = useState('');
  const [editCustBuffaloMorningQty, setEditCustBuffaloMorningQty] = useState('');
  const [editCustBuffaloEveningQty, setEditCustBuffaloEveningQty] = useState('');
  const [editCustBalance, setEditCustBalance] = useState('');
  const [editCustStatus, setEditCustStatus] = useState<'active' | 'paused' | 'inactive'>('active');

  // Legacy edit states kept for safety / backward compatibility
  const [editCustMilkType, setEditCustMilkType] = useState<'cow' | 'buffalo'>('cow');
  const [editCustRate, setEditCustRate] = useState('');

  // Entry logs inputs
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [entryCustId, setEntryCustId] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryShift, setEntryShift] = useState<'morning' | 'evening'>('morning');
  const [entryMilkType, setEntryMilkType] = useState<'cow' | 'buffalo'>('cow');
  const [entryQty, setEntryQty] = useState('1');
  const [entryRate, setEntryRate] = useState('60');
  const [entryNote, setEntryNote] = useState('');
  const [entryBuffaloTier, setEntryBuffaloTier] = useState<'standard' | 'premium'>('standard');
  const [loggingEntry, setLoggingEntry] = useState(false);

  // Edit entry logs inputs
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState('');
  const [editEntryCustId, setEditEntryCustId] = useState('');
  const [editEntryDate, setEditEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editEntryShift, setEditEntryShift] = useState<'morning' | 'evening'>('morning');
  const [editEntryMilkType, setEditEntryMilkType] = useState<'cow' | 'buffalo'>('cow');
  const [editEntryQty, setEditEntryQty] = useState('1');
  const [editEntryRate, setEditEntryRate] = useState('60');
  const [editEntryNote, setEditEntryNote] = useState('');

  // Bulk entry selection state
  const [quickEntrySelections, setQuickEntrySelections] = useState<Record<string, boolean>>({});

  // Billing inputs
  const [billMonth, setBillMonth] = useState(() => String(new Date().getMonth() + 1));
  const [billYear, setBillYear] = useState(() => String(new Date().getFullYear()));

  // Announcement inputs
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // Quick Bulk Entry states
  const [quickEntryDate, setQuickEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dashboardDate, setDashboardDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickEntryShift, setQuickEntryShift] = useState<'morning' | 'evening'>('morning');
  const [quickEntryQtys, setQuickEntryQtys] = useState<Record<string, string>>({});

  // Cash Sale states
  const [isCashSaleOpen, setIsCashSaleOpen] = useState(false);
  const [cashSaleDate, setCashSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashSaleMilkType, setCashSaleMilkType] = useState<'cow' | 'buffalo_standard' | 'buffalo_premium'>('cow');
  const [cashSaleAmount, setCashSaleAmount] = useState('');
  const [allCashSales, setAllCashSales] = useState<any[]>([]);

  // Calendar States
  const [selectedCustCalendar, setSelectedCustCalendar] = useState<any>(null);
  const [isCustCalendarOpen, setIsCustCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [loggedInCustomerId, setLoggedInCustomerId] = useState(() => {
    return localStorage.getItem('loggedInCustomerId') || 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  });

  // Modals / Form inputs
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subType, setSubType] = useState<'cow' | 'buffalo'>('cow');
  const [subQty, setSubQty] = useState('1');
  const [subShift, setSubShift] = useState<'morning' | 'evening' | 'both'>('morning');

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookType, setBookType] = useState<'cow' | 'buffalo'>('cow');
  const [bookQty, setBookQty] = useState('1');
  const [showBookTypeDropdown, setShowBookTypeDropdown] = useState(false);

  const [isSellingOpen, setIsSellingOpen] = useState(false);
  const [sellType, setSellType] = useState<'cow' | 'buffalo'>('cow');
  const [sellBreed, setSellBreed] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellYield, setSellYield] = useState('');
  const [sellLocation, setSellLocation] = useState('');

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');

  // Custom Alert Show wrapper
  const showAlert = (title: string, message: string) => {
    setCustomAlert({ title, message });
  };

  // Custom Confirm wrapper
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({ title, message, onConfirm });
  };

  // Fetch driver active assigned tasks helper
  const loadDriverTasks = async () => {
    try {
      const [subs, custs] = await Promise.all([
        fetchFromBackend('/api/subscriptions'),
        fetchFromBackend('/api/customers')
      ]);
      const activeSubs = subs.filter((s: any) => s.status === 'active');
      const tasks = activeSubs.map((sub: any, idx: number) => {
        const customer = custs.find((c: any) => c.id === sub.customerId) || {};
        return {
          id: sub.id,
          taskNum: `Task ${idx + 1}: ${customer.name || 'Valued Customer'}`,
          address: customer.address || 'Address not set',
          detail: `${sub.milkType === 'cow' ? 'Cow' : 'Buffalo'} Milk • ${sub.quantity}L (${sub.deliveryTime})`,
          customerId: sub.customerId,
          milkType: sub.milkType,
          quantity: sub.quantity,
          rate: customer.rate || 60
        };
      });
      setActiveTasks(tasks);
    } catch (err) {
      console.error('Failed to load driver tasks:', err);
    }
  };

  // Main synchronization method to pull all data dynamically from APIs
  const loadAllData = async () => {
    try {
      // 1. Fetch live settings rates
      const settings = await fetchFromBackend('/api/settings/fetch');
      const cow = settings.find((item: any) => item.key === 'cow_base_rate');
      const buff = settings.find((item: any) => item.key === 'buffalo_base_rate');
      const buffPrem = settings.find((item: any) => item.key === 'buffalo_premium_rate');
      if (cow) setCowRate(parseFloat(cow.value).toFixed(2));
      if (buff) setBuffaloRate(parseFloat(buff.value).toFixed(2));
      if (buffPrem) setBuffaloPremiumRate(parseFloat(buffPrem.value).toFixed(2));

      // 2. Fetch customers
      const customers = await fetchFromBackend('/api/customers');
      setAllCustomers(customers);
      const currentCust = customers.find((c: any) => c.id === loggedInCustomerId);
      if (currentCust) {
        setWalletBalance(currentCust.balance.toString());
      }

      // 3. Fetch subscriptions
      const subs = await fetchFromBackend('/api/subscriptions');
      setAllSubscriptions(subs);
      const custSubs = subs.filter((s: any) => s.customerId === loggedInCustomerId);
      setSubscriptions(custSubs.map((s: any) => ({
        id: s.id,
        type: s.milkType,
        qty: s.quantity,
        shift: s.deliveryTime,
        status: s.status
      })));

      // 4. Fetch deliveries logs (milk entries)
      const entries = await fetchFromBackend('/api/entries');
      setAllEntries(entries);
      const custEntries = entries.filter((e: any) => e.customerId === loggedInCustomerId);
      custEntries.sort((a: any, b: any) => b.date.localeCompare(a.date));
      setDeliveries(custEntries.map((e: any) => ({
        id: e.id,
        date: e.date,
        morning: `${e.milkType === 'cow' ? 'Cow' : 'Buffalo'} Milk - ${e.quantity}L`,
        status: 'delivered'
      })));

      // 5. Fetch bills
      const allBillsData = await fetchFromBackend('/api/bills');
      setAllBills(allBillsData);
      const custBills = allBillsData.filter((b: any) => b.customerId === loggedInCustomerId);
      custBills.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      setBills(custBills.map((b: any) => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[b.month - 1] || 'Month';
        return {
          id: b.id,
          month: `${monthName} ${b.year}`,
          totalQty: `${b.milkQtyCow + b.milkQtyBuffalo}L`,
          grandTotal: b.grandTotal,
          status: b.status,
          pdf: b.pdfUrl || 'https://supabase.co/storage/v1/object/public/invoices/may2026_sharma.pdf'
        };
      }));

      // 6. Fetch cattle listings
      const listings = await fetchFromBackend('/api/animal-listings');
      setAllListings(listings);
      const approvedListings = listings.filter((l: any) => l.status === 'approved' || l.sellerId === loggedInCustomerId);
      setMarketplace(approvedListings.map((l: any) => ({
        id: l.id,
        type: l.animalType,
        breed: l.breed,
        age: l.ageYears,
        yield: l.dailyMilkYield,
        price: l.price,
        location: l.location,
        sellerPhone: l.contactNumber,
        image: l.images?.[0] || (l.animalType === 'cow' 
          ? 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500'
          : 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=500')
      })));

      // 7. Load driver tasks
      await loadDriverTasks();

      // 8. Fetch notifications
      const notifs = await fetchFromBackend('/api/notifications');
      const custNotifs = notifs.filter((n: any) => n.userId === loggedInCustomerId || n.user_id === loggedInCustomerId);
      custNotifs.sort((a: any, b: any) => b.sentAt ? b.sentAt.localeCompare(a.sentAt) : 1);
      setNotifications(custNotifs);

      // 9. Fetch all orders
      const orders = await fetchFromBackend('/api/orders');
      setAllOrders(orders);

      // 10. Fetch daily cash sales
      try {
        const cashSales = await fetchFromBackend('/api/daily-cash');
        setAllCashSales(cashSales);
      } catch {
        setAllCashSales([]);
      }
    } catch (err) {
      console.error('Failed to sync settings from Backend:', err);
    }
  };

  // Real-time Supabase postgres channel listener
  useEffect(() => {
    if (!supabase) return;
    const CUSTOMER_UUIDS = [
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // cust1 - Sharma Ji
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', // cust2 - Amit Kumar
      'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', // cust3 - Rajesh Singh
    ];
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('Realtime notification received in PWA:', payload.new);
          if (CUSTOMER_UUIDS.includes(payload.new.user_id)) {
            showAlert(payload.new.title, payload.new.message);
            loadAllData();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync details on active tabs/logins
  useEffect(() => {
    loadAllData();
  }, [isLoggedIn, currentTab, role, loggedInCustomerId]);

  useEffect(() => {
    localStorage.setItem('adminTab', adminTab);
  }, [adminTab]);

  // Poll backend every 30 seconds
  useEffect(() => {
    if (!isLoggedIn) return;
    const pollInterval = setInterval(async () => {
      try {
        const settings = await fetchFromBackend('/api/settings/fetch');
        const cow = settings.find((item: any) => item.key === 'cow_base_rate');
        const buff = settings.find((item: any) => item.key === 'buffalo_base_rate');
        const buffPrem = settings.find((item: any) => item.key === 'buffalo_premium_rate');
        if (cow) setCowRate(parseFloat(cow.value).toFixed(2));
        if (buff) setBuffaloRate(parseFloat(buff.value).toFixed(2));
        if (buffPrem) setBuffaloPremiumRate(parseFloat(buffPrem.value).toFixed(2));

        const notifs = await fetchFromBackend('/api/notifications');
        const custNotifs = notifs.filter((n: any) => n.userId === loggedInCustomerId || n.user_id === loggedInCustomerId);
        custNotifs.sort((a: any, b: any) => b.sentAt ? b.sentAt.localeCompare(a.sentAt) : 1);
        setNotifications(custNotifs);
      } catch (err) {
        // Silent fail
      }
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [isLoggedIn, loggedInCustomerId]);

  // Handle Login
  const handleLogin = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();

    if (!trimEmail || !trimPass) {
      showAlert('Validation Error', 'Please enter both email and password.');
      return;
    }

    let matchedRole: 'admin' | 'customer' | 'delivery_staff' | null = null;
    for (const [r, creds] of Object.entries(CREDENTIALS)) {
      if (creds.email === trimEmail && creds.password === trimPass) {
        matchedRole = r as 'admin' | 'customer' | 'delivery_staff';
        break;
      }
    }

    if (matchedRole) {
      setRole(matchedRole);
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('email', trimEmail);
      localStorage.setItem('role', matchedRole);
      return;
    }

    // Dynamic database check from users table (login via mobile number)
    try {
      const phoneQuery = trimEmail.startsWith('+') ? trimEmail : `+91${trimEmail}`;
      const rawPhoneQuery = trimEmail.replace(/\D/g, '');

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq."${trimEmail}",phone.eq."${phoneQuery}",phone.eq."${rawPhoneQuery}",email.eq."${trimEmail}"`);

      if (error) throw error;

      if (userData && userData.length > 0) {
        const matchedUser = userData[0];
        let defaultPass = 'milk@123';
        if (matchedUser.role === 'admin') defaultPass = 'admin@123';
        if (matchedUser.role === 'delivery_staff') defaultPass = 'driver@123';

        const isValidPassword = 
          trimPass === defaultPass || 
          trimPass === matchedUser.phone || 
          trimPass === matchedUser.phone.replace('+91', '') ||
          trimPass === 'milk123';

        if (isValidPassword) {
          setRole(matchedUser.role);
          setIsLoggedIn(true);
          setLoggedInCustomerId(matchedUser.id);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('email', trimEmail);
          localStorage.setItem('role', matchedUser.role);
          localStorage.setItem('loggedInCustomerId', matchedUser.id);
          showAlert('Login Success 🎉', `Welcome back!`);
          return;
        } else {
          showAlert('Login Failed ❌', 'Invalid password for this mobile number.');
          return;
        }
      }
    } catch (err: any) {
      console.error('[Login] Supabase database login error:', err.message);
    }

    showAlert('Login Failed ❌', 'Invalid email, phone number, or password.');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  };

  const updateCustomerProfileSelection = (id: string) => {
    setLoggedInCustomerId(id);
    localStorage.setItem('loggedInCustomerId', id);
  };

  // Create Subscription
  const handleSubscribe = async () => {
    try {
      await fetchFromBackend('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: loggedInCustomerId,
          milkType: subType,
          quantity: Number(subQty),
          deliveryTime: subShift,
          status: 'active'
        })
      });
      setIsSubscribeOpen(false);
      showAlert('Subscription Success 🥛', 'Your daily milk subscription scheduled successfully!');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to schedule subscription on backend.');
    }
  };

  // Instant Booking
  const handleBook = async () => {
    try {
      await fetchFromBackend('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: loggedInCustomerId,
          date: new Date().toISOString().split('T')[0],
          shift: 'evening',
          milkType: bookType,
          quantity: Number(bookQty),
          rate: bookType === 'cow' ? Number(cowRate) : Number(buffaloRate),
          status: 'pending',
          paymentStatus: 'pending',
          addressId: null
        })
      });
      showAlert('Milk Booked Instantly ⚡', `Your order for ${bookQty}L of ${bookType} milk is accepted. Status: Pending Delivery.`);
      setIsBookingOpen(false);
      setShowBookTypeDropdown(false);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to book milk on backend.');
    }
  };

  // Animal Sell
  const handleSell = async () => {
    if (!sellBreed || !sellPrice || !sellLocation) {
      showAlert('Validation Error', 'Please fill breed, price, and location.');
      return;
    }
    try {
      await fetchFromBackend('/api/animal-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: loggedInCustomerId,
          animalType: sellType,
          breed: sellBreed,
          ageYears: 3,
          dailyMilkYield: Number(sellYield) || 10,
          price: Number(sellPrice),
          description: `Healthy ${sellBreed} ${sellType} listed by customer.`,
          contactNumber: '9876543210',
          location: sellLocation,
          status: 'pending',
          images: [
            sellType === 'cow' 
              ? 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500'
              : 'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=500'
          ]
        })
      });
      setIsSellingOpen(false);
      showAlert('Listing Submitted 🌾', 'Your animal advertisement was submitted for Admin approval.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to post animal listing to backend.');
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportMsg) {
      showAlert('Validation Error', 'Please enter your message.');
      return;
    }
    const currentCustProfile = allCustomers.find((c: any) => c.id === loggedInCustomerId) || {};
    try {
      await fetchFromBackend('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentCustProfile.name || 'Valued Customer',
          mobile: currentCustProfile.mobile || '9876543210',
          email: 'customer@doodhfarm.com',
          message: supportMsg
        })
      });
      showAlert('Inquiry Sent 💬', 'Thank you! Support team will reach out to you via SMS/Email.');
      setIsSupportOpen(false);
      setSupportMsg('');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to submit inquiry to backend.');
    }
  };

  // Driver Workspace Mark Delivered Action
  const handleMarkDelivered = async (task: any) => {
    try {
      await fetchFromBackend('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: task.customerId,
          date: new Date().toISOString().split('T')[0],
          shift: 'morning',
          milkType: task.milkType,
          quantity: task.quantity,
          rate: task.rate,
          createdBy: 'staff1'
        })
      });
      showAlert('Success 🥛', `Milk delivery logged for ${task.taskNum.split(': ')[1]}.`);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to log delivery entry on server.');
    }
  };

  // --- ADMIN HANDLERS ---
  const handleUpdateRate = async (key: 'cow_base_rate' | 'buffalo_base_rate' | 'buffalo_premium_rate', value: string) => {
    setUpdatingRates(prev => ({ ...prev, [key]: true }));
    const startTime = Date.now();
    try {
      await fetchFromBackend('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      // Enforce minimum loader duration of 800ms for premium visual feedback
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
      }
      showAlert('Success 📈', 'Base milk rate updated & broadcasted to customers.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update rate.');
    } finally {
      setUpdatingRates(prev => ({ ...prev, [key]: false }));
    }
  };

  const getDefaultRate = (milkType: string, buffaloTier: string) => {
    if (milkType === 'cow') return Number(cowRate);
    if (buffaloTier === 'premium') return Number(buffaloPremiumRate);
    return Number(buffaloRate);
  };

  const handleAddCustomer = async () => {
    if (!newCustName || !newCustMobile || !newCustAddress) {
      showAlert('Validation Error', 'Please fill name, mobile, and address.');
      return;
    }
    setRegisteringCustomer(true);
    const startTime = Date.now();
    try {
      await fetchFromBackend('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustName,
          mobile: newCustMobile,
          address: newCustAddress,
          type: newCustType,
          status: 'active',
          balance: Number(newCustBalance) || 0,
          buffaloTier: newCustBuffaloTier,
          cowRate: Number(newCustCowRate) || 0,
          cowMorningQty: Number(newCustCowMorningQty) || 0,
          cowEveningQty: Number(newCustCowEveningQty) || 0,
          buffaloRate: Number(newCustBuffaloRate) || 0,
          buffaloMorningQty: Number(newCustBuffaloMorningQty) || 0,
          buffaloEveningQty: Number(newCustBuffaloEveningQty) || 0
        })
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
      }
      setIsAddCustOpen(false);
      showAlert('Success 🎉', 'New customer profile registered successfully!');
      
      // Reset inputs
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
      setNewCustBalance('');
      setNewCustCowMorningQty('');
      setNewCustCowEveningQty('');
      setNewCustBuffaloMorningQty('');
      setNewCustBuffaloEveningQty('');
      setNewCustCowRate('');
      setNewCustBuffaloRate('');
      setNewCustBuffaloTier('standard');
      
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to register customer on backend.');
    } finally {
      setRegisteringCustomer(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;
    try {
      await fetchFromBackend(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCustName,
          mobile: editCustMobile,
          address: editCustAddress,
          type: editCustType,
          status: editCustStatus,
          balance: Number(editCustBalance),
          buffaloTier: editCustBuffaloTier,
          cowRate: Number(editCustCowRate) || 0,
          cowMorningQty: Number(editCustCowMorningQty) || 0,
          cowEveningQty: Number(editCustCowEveningQty) || 0,
          buffaloRate: Number(editCustBuffaloRate) || 0,
          buffaloMorningQty: Number(editCustBuffaloMorningQty) || 0,
          buffaloEveningQty: Number(editCustBuffaloEveningQty) || 0
        })
      });
      setIsEditCustOpen(false);
      setSelectedCustomer(null);
      showAlert('Updated ✔', 'Customer profile updated successfully.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update customer details.');
    }
  };

  const handleAddEntry = async () => {
    if (!entryCustId) {
      showAlert('Validation Error', 'Please select a customer.');
      return;
    }
    setLoggingEntry(true);
    const startTime = Date.now();
    try {
      await fetchFromBackend('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: entryCustId,
          date: entryDate,
          shift: entryShift,
          milkType: entryMilkType,
          quantity: Number(entryQty),
          rate: Number(entryRate),
          note: entryNote,
          createdBy: 'admin'
        })
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
      }
      setIsAddEntryOpen(false);
      showAlert('Success 🥛', 'Delivery log added successfully.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to log milk entry.');
    } finally {
      setLoggingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this milk log? Customer balance will be reverted.',
      async () => {
        try {
          await fetchFromBackend(`/api/entries/${entryId}`, { method: 'DELETE' });
          showAlert('Success', 'Entry deleted successfully.');
          loadAllData();
        } catch (err) {
          showAlert('Error', 'Failed to delete entry.');
        }
      }
    );
  };

  const handleEditEntry = async () => {
    if (!editEntryId) return;
    try {
      await fetchFromBackend(`/api/entries/${editEntryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Number(editEntryQty),
          rate: Number(editEntryRate),
          note: editEntryNote
        })
      });
      setIsEditEntryOpen(false);
      showAlert('Success 🥛', 'Delivery log updated successfully.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update milk entry.');
    }
  };

  const handleDeleteCashSale = async (cashSaleId: string) => {
    showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this cash sale record?',
      async () => {
        try {
          await fetchFromBackend(`/api/daily-cash/${cashSaleId}`, { method: 'DELETE' });
          showAlert('Success', 'Cash sale record deleted successfully.');
          loadAllData();
        } catch (err) {
          showAlert('Error', 'Failed to delete cash sale record.');
        }
      }
    );
  };

  const handleUpdateSubStatus = async (subId: string, status: string) => {
    try {
      await fetchFromBackend(`/api/subscriptions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showAlert('Success', `Subscription status updated to ${status}.`);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update subscription status.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetchFromBackend(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showAlert('Success', `Order marked as ${status}.`);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update order status.');
    }
  };

  const handleUpdateListingStatus = async (listingId: string, status: string) => {
    try {
      await fetchFromBackend(`/api/animal-listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showAlert('Success', `Cattle marketplace listing ${status}.`);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to update marketplace listing status.');
    }
  };

  const handleBulkEntry = async () => {
    const monthlyCustomers = allCustomers.filter((c: any) => c.type === 'monthly' && c.status === 'active');
    const entriesToLog = monthlyCustomers
      .filter((cust: any) => {
        // Skip if they are deselected in the checklist
        const isSelected = quickEntrySelections[cust.id] !== false;
        if (!isSelected) return false;

        const qty = Number(quickEntryQtys[cust.id] ?? (quickEntryShift === 'morning' ? cust.morningQty : cust.eveningQty));
        return qty > 0;
      })
      .map((cust: any) => ({
        customerId: cust.id,
        date: quickEntryDate,
        shift: quickEntryShift,
        milkType: cust.milkType,
        quantity: Number(quickEntryQtys[cust.id] ?? (quickEntryShift === 'morning' ? cust.morningQty : cust.eveningQty)),
        rate: cust.rate,
        note: ''
      }));

    if (entriesToLog.length === 0) {
      showAlert('Nothing to log', 'No customers selected or all selected customers have 0L quantity.');
      return;
    }

    try {
      const result = await fetchFromBackend('/api/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesToLog })
      });
      showAlert(
        'Bulk Entry Done ⚡',
        `Logged: ${result.logged} • Skipped (already exists): ${result.skipped}\nDate: ${quickEntryDate} • Shift: ${quickEntryShift}`
      );
      setQuickEntryQtys({});
      setQuickEntrySelections({});
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to log bulk entries.');
    }
  };

  const handleCashSale = async () => {
    if (!cashSaleAmount || Number(cashSaleAmount) <= 0) {
      showAlert('Validation Error', 'Please enter a valid rupee amount.');
      return;
    }
    const milkTypeMap: Record<string, string> = {
      cow: 'cow',
      buffalo_standard: 'buffalo',
      buffalo_premium: 'buffalo'
    };
    const rateMap: Record<string, number> = {
      cow: Number(cowRate),
      buffalo_standard: Number(buffaloRate),
      buffalo_premium: Number(buffaloPremiumRate)
    };
    const resolvedMilkType = milkTypeMap[cashSaleMilkType];
    const resolvedRate = rateMap[cashSaleMilkType];
    const liters = resolvedRate > 0 ? (Number(cashSaleAmount) / resolvedRate).toFixed(2) : '0';
    try {
      await fetchFromBackend('/api/daily-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: cashSaleDate,
          amount: Number(cashSaleAmount),
          milkType: resolvedMilkType,
          rate: resolvedRate,
          note: `Walk-in cash: ₹${cashSaleAmount} (${cashSaleMilkType.replace('_', ' ')})`
        })
      });
      showAlert('Cash Sale Logged 💵', `₹${cashSaleAmount} recorded • ~${liters}L of ${cashSaleMilkType.replace('_', ' ')} milk`);
      setIsCashSaleOpen(false);
      setCashSaleAmount('');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to log cash sale.');
    }
  };

  const handleQuickCashSale = async (amount: number, type?: 'cow' | 'buffalo_standard' | 'buffalo_premium') => {
    const activeType = type || cashSaleMilkType;
    const milkTypeMap: Record<string, string> = {
      cow: 'cow',
      buffalo_standard: 'buffalo',
      buffalo_premium: 'buffalo'
    };
    const rateMap: Record<string, number> = {
      cow: Number(cowRate),
      buffalo_standard: Number(buffaloRate),
      buffalo_premium: Number(buffaloPremiumRate)
    };
    const resolvedMilkType = milkTypeMap[activeType];
    const resolvedRate = rateMap[activeType];
    const liters = resolvedRate > 0 ? (amount / resolvedRate).toFixed(2) : '0';
    try {
      await fetchFromBackend('/api/daily-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: quickEntryDate,
          amount: amount,
          milkType: resolvedMilkType,
          rate: resolvedRate,
          note: `Quick Cash: ₹${amount} (${activeType.replace('_', ' ')})`
        })
      });
      showAlert('Cash Sale Logged 💵', `₹${amount} recorded • ~${liters}L of ${activeType.replace('_', ' ')} milk`);
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to log cash sale.');
    }
  };

  const handleGenerateBills = async () => {
    try {
      await fetchFromBackend('/api/bills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: Number(billMonth), year: Number(billYear) })
      });
      showAlert('Success 🎉', 'Monthly bills statements generated successfully.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to generate bills.');
    }
  };

  const handleSendWhatsAppBill = async (billId: string) => {
    try {
      await fetchFromBackend(`/api/bills/${billId}/send-whatsapp`, { method: 'POST' });
      showAlert('WhatsApp Sent 📲', 'Invoice details sent to customer mobile.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to trigger WhatsApp invoice.');
    }
  };

  const handleMarkBillPaid = async (bill: any) => {
    try {
      await fetchFromBackend('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: bill.customerId,
          amount: bill.grandTotal,
          date: new Date().toISOString().split('T')[0],
          status: 'paid',
          method: 'cash',
          note: `Received cash for statement balance`
        })
      });
      showAlert('Paid ✔', 'Cash payment logged and ledger balance settled.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to record bill payment.');
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle || !announcementMsg) {
      showAlert('Validation Error', 'Please enter title and message.');
      return;
    }
    try {
      await Promise.all(
        allCustomers.map((c: any) =>
          fetchFromBackend('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: c.id,
              title: announcementTitle,
              message: announcementMsg,
              type: 'promo'
            })
          })
        )
      );
      setIsAnnouncementOpen(false);
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      showAlert('Broadcast Success 📣', 'Notification broadcasted to all customer devices.');
      loadAllData();
    } catch (err) {
      showAlert('Error', 'Failed to broadcast announcement.');
    }
  };

  // Render PWA Calendar Component
  const renderCalendar = (customerId: string) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

    const numDays = new Date(calYear, calMonth + 1, 0).getDate();
    const startDayOfWeek = new Date(calYear, calMonth, 1).getDay();

    const days: any[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ isPlaceholder: true });
    }
    for (let i = 1; i <= numDays; i++) {
      const dayStr = String(i).padStart(2, '0');
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;
      days.push({
        isPlaceholder: false,
        dayNum: i,
        date: dateStr
      });
    }

    const monthEntries = allEntries.filter((e: any) => {
      if (e.customerId !== customerId) return false;
      const entryDate = new Date(e.date);
      return entryDate.getMonth() === calMonth && entryDate.getFullYear() === calYear;
    });

    const totalCowQty = monthEntries.filter((e: any) => e.milkType === 'cow').reduce((sum, e) => sum + e.quantity, 0);
    const totalBuffaloQty = monthEntries.filter((e: any) => e.milkType === 'buffalo').reduce((sum, e) => sum + e.quantity, 0);
    const totalAmount = monthEntries.reduce((sum, e) => sum + (e.quantity * e.rate), 0);

    const handlePrevMonth = () => {
      if (calMonth === 0) {
        setCalMonth(11);
        setCalYear(prev => prev - 1);
      } else {
        setCalMonth(prev => prev - 1);
      }
    };

    const handleNextMonth = () => {
      if (calMonth === 11) {
        setCalMonth(0);
        setCalYear(prev => prev + 1);
      } else {
        setCalMonth(prev => prev + 1);
      }
    };

    const handleDayPress = (day: any) => {
      if (day.isPlaceholder) return;
      const dayEntries = allEntries.filter((e: any) => e.customerId === customerId && e.date === day.date);
      if (dayEntries.length === 0) {
        showAlert('No Delivery Logged', `No milk was delivered on ${day.date}.`);
        return;
      }
      
      let details = `Date: ${day.date}\n\n`;
      dayEntries.forEach((e: any) => {
        details += `• Shift: ${e.shift.charAt(0).toUpperCase() + e.shift.slice(1)}\n`;
        details += `  Type: ${e.milkType === 'cow' ? 'Cow' : 'Buffalo'} Milk\n`;
        details += `  Quantity: ${e.quantity}L\n`;
        details += `  Rate: ₹${e.rate}/L\n`;
        details += `  Amount: ₹${e.amount}\n`;
        if (e.note) details += `  Note: ${e.note}\n`;
        if (e.createdBy) details += `  Logged By: ${e.createdBy === 'staff1' ? 'Staff Driver' : 'Admin'}\n`;
        details += `\n`;
      });
      
      showAlert('Delivery Details 🥛', details);
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="w-9 h-9 bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 font-bold transition-all">
            ◀
          </button>
          <span className="text-sm font-bold text-slate-200">{monthNames[calMonth]} {calYear}</span>
          <button onClick={handleNextMonth} className="w-9 h-9 bg-slate-700/50 hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-300 font-bold transition-all">
            ▶
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <span key={day} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 bg-slate-900/40 p-1.5 rounded-xl border border-slate-800">
          {days.map((day, idx) => {
            if (day.isPlaceholder) {
              return <div key={`empty-${idx}`} className="aspect-square bg-transparent" />;
            }

            const dayEntries = allEntries.filter((e: any) => e.customerId === customerId && e.date === day.date);
            const morningEntry = dayEntries.find((e: any) => e.shift === 'morning');
            const eveningEntry = dayEntries.find((e: any) => e.shift === 'evening');
            const isToday = day.date === todayStr;

            return (
              <button
                key={`day-${day.dayNum}`}
                onClick={() => handleDayPress(day)}
                className={`aspect-square rounded-lg p-1 flex flex-col justify-between items-stretch text-left transition-all border ${
                  isToday 
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                    : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <span className={`text-[9px] font-extrabold self-end ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {day.dayNum}
                </span>
                <div className="flex flex-col gap-0.5 mt-auto">
                  {morningEntry && (
                    <div className="text-[7px] leading-none font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-900/50 rounded-sm py-0.5 text-center">
                      🌅 {morningEntry.quantity}L
                    </div>
                  )}
                  {eveningEntry && (
                    <div className="text-[7px] leading-none font-bold text-orange-400 bg-orange-950/80 border border-orange-900/50 rounded-sm py-0.5 text-center">
                      🌇 {eveningEntry.quantity}L
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Monthly Summary */}
        <div className="bg-slate-900/60 rounded-xl p-3 mt-4 border border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            📊 Consumption Summary
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-slate-500">🐄 Cow</p>
              <p className="text-sm font-bold text-slate-200">{totalCowQty.toFixed(1)}L</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">🐼 Buffalo</p>
              <p className="text-sm font-bold text-slate-200">{totalBuffaloQty.toFixed(1)}L</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">💰 Bill</p>
              <p className="text-sm font-bold text-emerald-400">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render main body based on Login / Role States
  const renderAppContent = () => {
    if (!isLoggedIn) {
      return (
        <div className="flex-1 flex flex-col justify-center p-6 bg-slate-950 overflow-y-auto relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all text-xs flex items-center justify-center cursor-pointer"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <div className="text-center mb-8">
            <span className="text-5xl block mb-2 animate-bounce">🥛</span>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              Doodh Hisaab
            </h1>
            <p className="text-xs text-slate-400 mt-1">Dairy Farm Management Platform</p>
          </div>

          {/* Credentials Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>🔐</span> Simulation Logins
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="font-bold text-purple-400 px-2 py-0.5 bg-purple-950/60 rounded">Admin</span>
                <div className="text-right">
                  <p className="text-slate-300 font-mono">admin@doodhfarm.com</p>
                  <p className="text-slate-500 font-mono italic">admin@123</p>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                <span className="font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/60 rounded">Customer</span>
                <div className="text-right">
                  <p className="text-slate-300 font-mono">customer@doodhfarm.com</p>
                  <p className="text-slate-500 font-mono italic">milk@123</p>
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-amber-400 px-2 py-0.5 bg-amber-950/60 rounded">Driver</span>
                <div className="text-right">
                  <p className="text-slate-300 font-mono">driver@doodhfarm.com</p>
                  <p className="text-slate-500 font-mono italic">driver@123</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-xl">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. admin@doodhfarm.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {email.trim().toLowerCase() === 'customer@doodhfarm.com' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Select Customer Profile
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {allCustomers.map(cust => (
                      <button 
                        key={cust.id} 
                        onClick={() => updateCustomerProfileSelection(cust.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                          loggedInCustomerId === cust.id 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cust.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                onClick={handleLogin}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 mt-6"
              >
                Sign In →
              </button>
            </div>
          </div>
        </div>
      );
    }

    // --- 1. ADMIN PANEL ---
    if (role === 'admin') {
      return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                Admin Control 👑
              </h2>
              <p className="text-[10px] text-emerald-400 font-bold tracking-wide mt-0.5">
                Doodh Hisaab Backend Connected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all text-xs flex items-center justify-center cursor-pointer"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-bold text-slate-400 bg-slate-800/80 hover:bg-slate-800 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-slate-700/50 transition-all"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Subpages Scroll Container */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            
            {/* Dashboard Subtab */}
            {adminTab === 'dashboard' && (
              <div className="space-y-4">
                {/* Stats Grid */}
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overview Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 text-center">
                    <span className="text-xl block mb-1">🥛</span>
                    <p className="text-lg font-extrabold text-slate-200">
                      {allEntries.filter(e => e.date === new Date().toISOString().split('T')[0]).reduce((sum, e) => sum + e.quantity, 0)}L
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Today's Milk</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 text-center">
                    <span className="text-xl block mb-1">₹</span>
                    <p className="text-lg font-extrabold text-slate-200">
                      ₹{allBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.grandTotal, 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Pending Bills</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 text-center">
                    <span className="text-xl block mb-1">💵</span>
                    <p className="text-lg font-extrabold text-slate-200">
                      ₹{allCashSales.filter(cs => cs.date === new Date().toISOString().split('T')[0]).reduce((s, cs) => s + cs.amount, 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Today's Cash</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 text-center">
                    <span className="text-xl block mb-1">📈</span>
                    <p className="text-lg font-extrabold text-slate-200">
                      ₹{allBills.reduce((sum, b) => sum + b.grandTotal, 0).toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Total Revenue</p>
                  </div>
                </div>

                {/* Rate settings */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-3">
                    🥛 Milk Rate Settings (₹)
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24">Cow Milk</span>
                      <input 
                        type="number"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-center w-20 text-slate-200"
                        value={cowRate}
                        onChange={(e) => setCowRate(e.target.value)}
                      />
                      <button 
                        onClick={() => handleUpdateRate('cow_base_rate', cowRate)}
                        disabled={updatingRates['cow_base_rate']}
                        className={`bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all flex-1 flex items-center justify-center gap-1.5 min-h-[26px] ${
                          updatingRates['cow_base_rate'] 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {updatingRates['cow_base_rate'] ? (
                          <>
                            <span className="custom-spinner"></span>
                            <span>Updating...</span>
                          </>
                        ) : (
                          'Update'
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24">Buffalo Std</span>
                      <input 
                        type="number"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-center w-20 text-slate-200"
                        value={buffaloRate}
                        onChange={(e) => setBuffaloRate(e.target.value)}
                      />
                      <button 
                        onClick={() => handleUpdateRate('buffalo_base_rate', buffaloRate)}
                        disabled={updatingRates['buffalo_base_rate']}
                        className={`bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all flex-1 flex items-center justify-center gap-1.5 min-h-[26px] ${
                          updatingRates['buffalo_base_rate'] 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {updatingRates['buffalo_base_rate'] ? (
                          <>
                            <span className="custom-spinner"></span>
                            <span>Updating...</span>
                          </>
                        ) : (
                          'Update'
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24">Buff Premium</span>
                      <input 
                        type="number"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-center w-20 text-slate-200"
                        value={buffaloPremiumRate}
                        onChange={(e) => setBuffaloPremiumRate(e.target.value)}
                      />
                      <button 
                        onClick={() => handleUpdateRate('buffalo_premium_rate', buffaloPremiumRate)}
                        disabled={updatingRates['buffalo_premium_rate']}
                        className={`bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all flex-1 flex items-center justify-center gap-1.5 min-h-[26px] ${
                          updatingRates['buffalo_premium_rate'] 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {updatingRates['buffalo_premium_rate'] ? (
                          <>
                            <span className="custom-spinner"></span>
                            <span>Updating...</span>
                          </>
                        ) : (
                          'Update'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Announcement box */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-200 block mb-1">Broadcast Announcement 📣</h4>
                  <p className="text-[10px] text-slate-500 mb-3">Send push alert notifications to all dairy users instantly.</p>
                  <button 
                    onClick={() => setIsAnnouncementOpen(true)}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    Create Broadcast Alert
                  </button>
                </div>

                {/* Daily Sales Ledger Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                    <h4 className="text-xs font-bold text-slate-200">Daily Sales Ledger 📋</h4>
                    <input 
                      type="date"
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none w-32"
                      value={dashboardDate}
                      onChange={(e) => setDashboardDate(e.target.value)}
                    />
                  </div>

                  {/* Calculations for currently selected date */}
                  {(() => {
                    const dateEntries = allEntries.filter(e => e.date === dashboardDate);
                    const dateCashSales = allCashSales.filter(cs => cs.date === dashboardDate);

                    const cowQty = dateEntries.filter(e => e.milkType === 'cow').reduce((sum, e) => sum + e.quantity, 0);
                    const buffQty = dateEntries.filter(e => e.milkType === 'buffalo').reduce((sum, e) => sum + e.quantity, 0);
                    const ledgerTotal = dateEntries.reduce((sum, e) => sum + (e.quantity * e.rate), 0);

                    const cashQty = dateCashSales.reduce((sum, cs) => sum + cs.liters, 0);
                    const cashTotal = dateCashSales.reduce((sum, cs) => sum + cs.amount, 0);

                    return (
                      <>
                        {/* Daily Ledger stats summary */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-450 bg-slate-950/40 p-2.5 border border-slate-850 rounded-xl">
                          <div>
                            <p className="font-semibold text-slate-500 uppercase tracking-wider">🐄 Cow Milk</p>
                            <p className="text-xs font-extrabold text-slate-200 mt-0.5">{cowQty.toFixed(1)}L</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500 uppercase tracking-wider">🐼 Buffalo Milk</p>
                            <p className="text-xs font-extrabold text-slate-200 mt-0.5">{buffQty.toFixed(1)}L</p>
                          </div>
                          <div className="border-t border-slate-850 pt-1.5 mt-1">
                            <p className="font-semibold text-slate-500 uppercase tracking-wider">💵 Cash Sales</p>
                            <p className="text-xs font-extrabold text-emerald-400 mt-0.5">₹{cashTotal.toLocaleString()} (~{cashQty.toFixed(1)}L)</p>
                          </div>
                          <div className="border-t border-slate-850 pt-1.5 mt-1">
                            <p className="font-semibold text-slate-500 uppercase tracking-wider">💳 Ledger Sales</p>
                            <p className="text-xs font-extrabold text-emerald-450 mt-0.5">₹{ledgerTotal.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* List of entries on selected date */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transactions ({dateEntries.length + dateCashSales.length})</span>
                          {dateEntries.length === 0 && dateCashSales.length === 0 ? (
                            <p className="text-[11px] text-slate-500 text-center py-4 bg-slate-950/20 rounded-lg">No entries logged for this date.</p>
                          ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {/* Customer entries */}
                              {dateEntries.map(entry => {
                                const customer = allCustomers.find(c => c.id === entry.customerId) || {};
                                return (
                                  <div key={entry.id} className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-1.5 text-left">
                                    <div className="flex justify-between items-start text-xs">
                                      <div>
                                        <p className="font-bold text-slate-200">{customer.name || 'Monthly Customer'}</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wide">
                                          {entry.shift} • {entry.milkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'}
                                        </p>
                                      </div>
                                      <span className="font-bold text-emerald-400">₹{entry.quantity * entry.rate}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-1.5 mt-1">
                                      <span>{entry.quantity}L @ ₹{entry.rate}/L</span>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => {
                                            setEditEntryId(entry.id);
                                            setEditEntryCustId(entry.customerId);
                                            setEditEntryDate(entry.date);
                                            setEditEntryShift(entry.shift);
                                            setEditEntryMilkType(entry.milkType);
                                            setEditEntryQty(String(entry.quantity));
                                            setEditEntryRate(String(entry.rate));
                                            setEditEntryNote(entry.note || '');
                                            setIsEditEntryOpen(true);
                                          }}
                                          className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded transition-all"
                                        >
                                          Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-900/50 hover:bg-red-650 hover:text-white px-2 py-0.5 rounded transition-all"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                    {entry.note && (
                                      <p className="text-[9px] text-slate-500 italic mt-0.5">Note: {entry.note}</p>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Cash Sales */}
                              {dateCashSales.map(cs => (
                                <div key={cs.id} className="bg-slate-950 border border-amber-950/20 p-2.5 rounded-xl space-y-1.5 text-left">
                                  <div className="flex justify-between items-start text-xs">
                                    <div>
                                      <p className="font-bold text-amber-400">Walk-in Cash Sale 💵</p>
                                      <p className="text-[9px] text-slate-500 uppercase tracking-wide">
                                        {cs.milkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'}
                                      </p>
                                    </div>
                                    <span className="font-bold text-emerald-400">₹{cs.amount}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-1.5 mt-1">
                                    <span>~{cs.liters.toFixed(2)}L @ ₹{cs.rate}/L</span>
                                    <button 
                                      onClick={() => handleDeleteCashSale(cs.id)}
                                      className="text-[9px] font-bold text-red-450 bg-red-950/40 border border-red-900/50 hover:bg-red-650 hover:text-white px-2 py-0.5 rounded transition-all"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                  {cs.note && (
                                    <p className="text-[9px] text-slate-500 italic mt-0.5">Note: {cs.note}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Pending One-time Bookings */}
                <h4 className="text-xs font-bold text-slate-400 block pt-2">Express Booking Orders</h4>
                {allOrders.filter(o => o.status === 'pending').length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4 bg-slate-900/30 border border-slate-900 rounded-xl">No pending bookings recorded.</p>
                ) : (
                  allOrders.filter(o => o.status === 'pending').map(order => {
                    const customer = allCustomers.find(c => c.id === order.customerId) || {};
                    return (
                      <div key={order.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{customer.name || 'Customer'}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{order.milkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'} Milk</p>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/50 rounded-full px-2 py-0.5">
                            ₹{order.totalAmount}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Volume: {order.quantity}L | Date: {order.date}</p>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex-1 transition-all"
                          >
                            Accept & Deliver
                          </button>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Customers list Subtab */}
            {adminTab === 'customers' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Customers ({allCustomers.length})
                  </h3>
                  <button 
                    onClick={() => {
                      setNewCustCowRate(cowRate);
                      setNewCustBuffaloRate(newCustBuffaloTier === 'premium' ? buffaloPremiumRate : buffaloRate);
                      setIsAddCustOpen(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    + Add New Customer
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="🔍 Search customer by name or phone..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                  {customerSearchQuery && (
                    <button
                      onClick={() => setCustomerSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-500 hover:text-slate-350 bg-transparent border-0 cursor-pointer text-slate-400"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {(() => {
                  const filtered = allCustomers.filter(cust => {
                    const q = customerSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (cust.name || '').toLowerCase().includes(q) ||
                      (cust.mobile || '').toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8 bg-slate-900/40 border border-slate-900 rounded-2xl">
                        <p className="text-xs text-slate-500">No customers match "{customerSearchQuery}"</p>
                      </div>
                    );
                  }

                  return filtered.map(cust => {
                    const custSubs = allSubscriptions.filter(s => s.customerId === cust.id && s.status === 'active');
                    return (
                      <div key={cust.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{cust.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">📞 {cust.mobile}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase rounded px-2 py-0.5 ${
                            cust.type === 'prepaid' ? 'bg-blue-950/60 text-blue-400 border border-blue-900/50' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}>
                            {cust.type === 'prepaid' ? 'Prepaid Wallet' : 'Monthly Ledger'}
                          </span>
                        </div>
                        
                        <div className="text-[10px] text-slate-400 space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/40">
                          <p><span className="text-slate-600">Address:</span> {cust.address || 'Not set'}</p>
                          <p><span className="text-slate-600">Balance:</span> <span className={cust.balance < 0 ? 'text-red-400' : 'text-emerald-400'}>₹{cust.balance}</span></p>
                          <p><span className="text-slate-600">Custom Rate:</span> ₹{cust.rate}/L ({cust.milkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'})</p>
                        </div>

                        {custSubs.length > 0 ? (
                          <div className="space-y-1">
                            {custSubs.map(sub => (
                              <p key={sub.id} className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                Active Sub: {sub.quantity}L of {sub.milkType === 'cow' ? 'Cow' : 'Buffalo'} ({sub.deliveryTime})
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-red-400/80 italic font-medium">• No active daily subscriptions</p>
                        )}

                        <div className="flex gap-2 pt-1 border-t border-slate-800/30">
                          <button 
                            onClick={() => {
                              setSelectedCustCalendar(cust);
                              setCalMonth(new Date().getMonth());
                              setCalYear(new Date().getFullYear());
                              setIsCustCalendarOpen(true);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex-1 border border-slate-700/50 transition-all"
                          >
                            View Calendar
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setEditCustName(cust.name);
                              setEditCustMobile(cust.mobile);
                              setEditCustAddress(cust.address);
                              setEditCustType(cust.type);
                              setEditCustMilkType(cust.milkType);
                              setEditCustRate(String(cust.rate));
                              setEditCustBalance(String(cust.balance));
                              setEditCustStatus(cust.status);

                              // Retrieve quantities from active subscriptions
                              const activeSubs = allSubscriptions.filter(s => s.customerId === cust.id && s.status === 'active');
                              const cowMorn = activeSubs.find(s => s.milkType === 'cow' && s.deliveryTime === 'morning')?.quantity || 0;
                              const cowEve = activeSubs.find(s => s.milkType === 'cow' && s.deliveryTime === 'evening')?.quantity || 0;
                              const buffMorn = activeSubs.find(s => s.milkType === 'buffalo' && s.deliveryTime === 'morning')?.quantity || 0;
                              const buffEve = activeSubs.find(s => s.milkType === 'buffalo' && s.deliveryTime === 'evening')?.quantity || 0;

                              setEditCustCowMorningQty(cowMorn > 0 ? String(cowMorn) : '');
                              setEditCustCowEveningQty(cowEve > 0 ? String(cowEve) : '');
                              setEditCustBuffaloMorningQty(buffMorn > 0 ? String(buffMorn) : '');
                              setEditCustBuffaloEveningQty(buffEve > 0 ? String(buffEve) : '');

                              setEditCustCowRate(String(cust.cowRate || cowRate));
                              setEditCustBuffaloRate(String(cust.buffaloTier === 'premium' ? (cust.buffaloPremiumRate || buffaloPremiumRate) : (cust.buffaloRate || buffaloRate)));
                              setEditCustBuffaloTier(cust.buffaloTier || 'standard');

                              setIsEditCustOpen(true);
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-450 hover:text-white border border-emerald-500/20 text-[9px] font-bold px-2.5 py-1.5 rounded-lg flex-1 transition-all"
                          >
                            Edit Profile
                          </button>
                          {custSubs.map(sub => (
                            <button 
                              key={sub.id}
                              onClick={() => handleUpdateSubStatus(sub.id, sub.status === 'active' ? 'paused' : 'active')}
                              className="bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              {sub.status === 'active' ? 'Pause' : 'Resume'} {sub.milkType === 'cow' ? 'Cow' : 'Buffalo'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Quick entry Subtab */}
            {adminTab === 'quick_entry' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">⚡ Bulk Entry Quick Fill</h3>
                  <button 
                    onClick={() => setIsCashSaleOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-md shadow-amber-500/10"
                  >
                    💵 Log Walk-in Sale
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">Log deliveries for all monthly active customers at once.</p>

                {/* Filter Date + Shift */}
                <div className="grid grid-cols-2 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">DATE</label>
                    <input 
                      type="date"
                      className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 w-full"
                      value={quickEntryDate}
                      onChange={(e) => setQuickEntryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">SHIFT</label>
                    <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg">
                      <button 
                        onClick={() => setQuickEntryShift('morning')}
                        className={`flex-1 text-[10px] py-1 font-bold rounded-md transition-all ${
                          quickEntryShift === 'morning' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Morning
                      </button>
                      <button 
                        onClick={() => setQuickEntryShift('evening')}
                        className={`flex-1 text-[10px] py-1 font-bold rounded-md transition-all ${
                          quickEntryShift === 'evening' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Evening
                      </button>
                    </div>
                  </div>
                </div>

                {/* Walk-in Cash Sale Quick Collection Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">💵 Quick Walk-in Cash Sale</span>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        onClick={() => setCashSaleMilkType('cow')}
                        className={`text-[8px] font-bold px-2 py-0.5 rounded transition-all ${
                          cashSaleMilkType === 'cow' ? 'bg-amber-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Cow
                      </button>
                      <button 
                        onClick={() => setCashSaleMilkType('buffalo_standard')}
                        className={`text-[8px] font-bold px-2 py-0.5 rounded transition-all ${
                          cashSaleMilkType === 'buffalo_standard' ? 'bg-amber-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Buff Std
                      </button>
                      <button 
                        onClick={() => setCashSaleMilkType('buffalo_premium')}
                        className={`text-[8px] font-bold px-2 py-0.5 rounded transition-all ${
                          cashSaleMilkType === 'buffalo_premium' ? 'bg-amber-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Buff Prem
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[20, 30, 50, 100].map(amount => (
                      <button 
                        key={amount}
                        onClick={() => handleQuickCashSale(amount)}
                        className="flex-1 bg-slate-950 hover:bg-amber-600/10 border border-slate-800 hover:border-amber-500/30 text-slate-200 hover:text-amber-400 text-xs font-bold py-2 rounded-xl transition-all"
                      >
                        ₹{amount}
                      </button>
                    ))}
                    <button 
                      onClick={() => setIsCashSaleOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10 flex-none"
                    >
                      Custom +
                    </button>
                  </div>
                </div>

                {/* Quick Entry Customers list */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-slate-800/50 p-2.5 border-b border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center items-center">
                    <span className="col-span-2">Select</span>
                    <span className="col-span-5 text-left">Customer</span>
                    <span className="col-span-2">Sub Qty</span>
                    <span className="col-span-3">Today's Qty</span>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {allCustomers.filter(c => c.type === 'monthly' && c.status === 'active').map(cust => {
                      const subQty = quickEntryShift === 'morning' ? cust.morningQty : cust.eveningQty;
                      const currentQty = quickEntryQtys[cust.id] ?? String(subQty);
                      const isAlreadyLogged = allEntries.some(e => e.customerId === cust.id && e.date === quickEntryDate && e.shift === quickEntryShift);
                      const isSelected = quickEntrySelections[cust.id] !== false;
                      const label = cust.milkType === 'buffalo'
                        ? (cust.buffaloTier === 'premium' ? '🐼⭐' : '🐼')
                        : '🐄';
                      return (
                        <div key={cust.id} className="grid grid-cols-12 p-2.5 items-center text-center text-xs">
                          {/* Checkbox / Status */}
                          <div className="col-span-2 flex items-center justify-center">
                            {isAlreadyLogged ? (
                              <span className="text-[9px] text-emerald-450">✅</span>
                            ) : (
                              <input 
                                type="checkbox"
                                className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 rounded focus:ring-0 focus:ring-offset-0 text-emerald-500 accent-emerald-500 cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => setQuickEntrySelections(prev => ({ ...prev, [cust.id]: e.target.checked }))}
                              />
                            )}
                          </div>
                          {/* Customer Name */}
                          <div className="col-span-5 text-left">
                            <p className="font-bold text-slate-350 truncate">{cust.name}</p>
                            <p className="text-[9px] text-slate-500">{label} ₹{cust.rate}/L</p>
                          </div>
                          {/* Sub Qty */}
                          <span className="col-span-2 text-slate-405 font-bold">{subQty}L</span>
                          {/* Today's Qty input or Logged badge */}
                          <div className="col-span-3 flex justify-center">
                            {isAlreadyLogged ? (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-900/50 rounded px-1.5 py-0.5 whitespace-nowrap">
                                Logged
                              </span>
                            ) : (
                              <input 
                                type="number"
                                className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs font-bold text-slate-200 text-center py-1 w-14 focus:outline-none focus:border-emerald-500/70"
                                value={currentQty}
                                onChange={(e) => setQuickEntryQtys(prev => ({ ...prev, [cust.id]: e.target.value }))}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Log button */}
                <button 
                  onClick={handleBulkEntry}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  ⚡ Log selected entries for {quickEntryDate} ({quickEntryShift})
                </button>

                {/* Cash Sales list */}
                {allCashSales.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <h4 className="text-xs font-bold text-slate-400">Recent Walk-in Sales ({quickEntryDate})</h4>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/50">
                      {allCashSales.filter(cs => cs.date === quickEntryDate).length === 0 ? (
                        <p className="text-[10px] text-slate-550 text-center py-4">No cash sales logged for this date.</p>
                      ) : (
                        allCashSales.filter(cs => cs.date === quickEntryDate).map(cs => (
                          <div key={cs.id} className="p-3 text-xs flex justify-between items-center text-left">
                            <div>
                              <p className="font-bold text-slate-300">💵 ₹{cs.amount} • {cs.liters.toFixed(2)}L</p>
                              <p className="text-[9px] text-slate-500">Milk: {cs.milkType === 'cow' ? 'Cow' : 'Buffalo'} • Rate: ₹{cs.rate}/L</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteCashSale(cs.id)}
                              className="text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-900/50 hover:bg-red-650 hover:text-white px-2.5 py-1 rounded transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Entries Subtab */}
            {adminTab === 'entries' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Milk Delivery Logs</h3>
                  <button 
                    onClick={() => setIsAddEntryOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    + Log Single Delivery
                  </button>
                </div>

                {allEntries.map(entry => {
                  const customer = allCustomers.find(c => c.id === entry.customerId) || {};
                  return (
                    <div key={entry.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 flex justify-between items-center">
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-200">
                          {customer.name || 'Customer'} • {entry.milkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          Date: {entry.date} | Shift: {entry.shift} | {entry.quantity}L @ ₹{entry.rate}/L
                        </p>
                        <p className="text-[10px] font-bold text-emerald-400">
                          Charged: ₹{entry.amount} {entry.note ? `• note: ${entry.note}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditEntryId(entry.id);
                            setEditEntryCustId(entry.customerId);
                            setEditEntryDate(entry.date);
                            setEditEntryShift(entry.shift);
                            setEditEntryMilkType(entry.milkType);
                            setEditEntryQty(String(entry.quantity));
                            setEditEntryRate(String(entry.rate));
                            setEditEntryNote(entry.note || '');
                            setIsEditEntryOpen(true);
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500/30 text-[9px] font-bold px-3 py-2 rounded-lg transition-all"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="bg-red-500/10 hover:bg-red-550 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-white text-[9px] font-bold px-3 py-2 rounded-lg transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bills Subtab */}
            {adminTab === 'billing' && (
              <div className="space-y-4">
                {/* Generation Block */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200">Generate Customer Bills</h4>
                  <p className="text-[10px] text-slate-500">Calculate delivery logs and update ledger statements for a specific month.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">MONTH (1-12)</label>
                      <input 
                        type="number"
                        min="1" max="12"
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 w-full text-center"
                        value={billMonth}
                        onChange={(e) => setBillMonth(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">YEAR</label>
                      <input 
                        type="number"
                        className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 w-full text-center"
                        value={billYear}
                        onChange={(e) => setBillYear(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerateBills}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10"
                  >
                    Calculate & Generate Bills
                  </button>
                </div>

                {/* Statements List */}
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Billing Statements</h3>
                
                {allBills.map(bill => {
                  const customer = allCustomers.find(c => c.id === bill.customerId) || {};
                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                  const monthName = monthNames[bill.month - 1] || 'Month';
                  return (
                    <div key={bill.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <h4 className="font-bold text-slate-200">{customer.name || 'Customer'}</h4>
                          <p className="text-[9px] text-slate-500">{monthName} {bill.year}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${bill.status === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {bill.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Cow: {bill.milkQtyCow}L | Buffalo: {bill.milkQtyBuffalo}L</span>
                        <span className="font-bold text-slate-200">Total: ₹{bill.grandTotal}</span>
                      </div>

                      <div className="flex gap-2 pt-1 border-t border-slate-800/30">
                        {bill.status === 'pending' && (
                          <button 
                            onClick={() => handleMarkBillPaid(bill)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg flex-1 transition-all"
                          >
                            Mark Cash Paid
                          </button>
                        )}
                        <button 
                          onClick={() => handleSendWhatsAppBill(bill.id)}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-[9px] font-bold px-3 py-1.5 rounded-lg flex-1 border border-slate-700/50 transition-all"
                        >
                          Send WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Marketplace Subtab */}
            {adminTab === 'marketplace' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cattle Ads Moderation</h3>
                
                {allListings.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4 bg-slate-900/30 border border-slate-900 rounded-xl">No cattle ads posted yet.</p>
                ) : (
                  allListings.map(item => {
                    const seller = allCustomers.find(c => c.id === item.sellerId) || {};
                    return (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex gap-3 items-center">
                          <img 
                            src={item.images?.[0] || 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500'} 
                            alt={item.breed}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-800"
                          />
                          <div className="text-xs">
                            <h4 className="font-bold text-slate-200">{item.breed} ({item.animalType})</h4>
                            <p className="text-[9px] text-slate-500">Yield: {item.dailyMilkYield}L/day • Age: {item.ageYears} yrs</p>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 space-y-0.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                          <p>Price: <span className="font-bold text-emerald-400">₹{item.price}</span></p>
                          <p>Location: {item.location}</p>
                          <p>Seller: {seller.name || 'Seller'} ({item.contactNumber})</p>
                          <p>Status: <span className={`font-bold ${
                            item.status === 'approved' ? 'text-emerald-400' : item.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                          }`}>{item.status.toUpperCase()}</span></p>
                        </div>

                        {item.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateListingStatus(item.id, 'approved')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg flex-1 transition-all"
                            >
                              Approve Listing
                            </button>
                            <button 
                              onClick={() => handleUpdateListingStatus(item.id, 'rejected')}
                              className="bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[9px] font-bold px-3 py-1.5 rounded-lg flex-1 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Admin Navigation footer */}
          <div className="bg-slate-900 border-t border-slate-800 py-2.5 px-3 flex justify-between items-center shrink-0">
            <button 
              onClick={() => setAdminTab('dashboard')} 
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${adminTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">🏠</span>
              <span className="text-[8px] font-bold">Dashboard</span>
            </button>
            <button 
              onClick={() => setAdminTab('customers')} 
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${adminTab === 'customers' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">👥</span>
              <span className="text-[8px] font-bold">Customers</span>
            </button>
            <button 
              onClick={() => setAdminTab('quick_entry')} 
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${adminTab === 'quick_entry' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">⚡</span>
              <span className="text-[8px] font-bold">Quick entry</span>
            </button>
            <button 
              onClick={() => setAdminTab('entries')} 
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${adminTab === 'entries' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">📝</span>
              <span className="text-[8px] font-bold">Entries</span>
            </button>
            <button 
              onClick={() => setAdminTab('billing')} 
              className={`flex-1 flex flex-col items-center gap-1 transition-all ${adminTab === 'billing' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">💳</span>
              <span className="text-[8px] font-bold">Bills</span>
            </button>
          </div>
        </div>
      );
    }

    // --- 2. DRIVER PANEL ---
    if (role === 'delivery_staff') {
      return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-1">
                Driver Portal 🚚
              </h2>
              <p className="text-[9px] text-slate-500 mt-0.5">DL 3C AB 1234 • Ramesh Yadav</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all text-xs flex items-center justify-center cursor-pointer"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700/50 transition-all"
              >
                Exit
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's deliveries schedule</h3>
            
            {activeTasks.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6 bg-slate-900/30 border border-slate-900 rounded-xl">No active deliveries scheduled today.</p>
            ) : (
              activeTasks.map(task => (
                <div key={task.id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">{task.taskNum}</h4>
                  <p className="text-[10px] text-slate-500">📍 Address: {task.address}</p>
                  <p className="text-[11px] text-emerald-400 font-bold tracking-wide mt-1">🥛 {task.detail}</p>
                  
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => handleMarkDelivered(task)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-xl flex-1 transition-all shadow-md shadow-emerald-500/10"
                    >
                      Mark Delivered
                    </button>
                    <button 
                      onClick={() => showAlert('Skipped', 'Delivery task skipped.')}
                      className="bg-slate-800 hover:bg-slate-705 text-slate-400 text-[10px] font-bold px-3 py-2 rounded-xl border border-slate-700/55 transition-all"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    // --- 3. CUSTOMER PANEL ---
    const currentCustProfile = allCustomers.find((c: any) => c.id === loggedInCustomerId) || {};
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100">
              Hello, {currentCustProfile.name || 'Valued Customer'}
            </h2>
            <p className="text-[10px] text-emerald-450 font-bold mt-0.5">
              Wallet balance: <span className="text-slate-100">₹{walletBalance}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all text-xs flex items-center justify-center cursor-pointer"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {/* Notification bell */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all"
            >
              <span className="text-sm block">🔔</span>
              {notifications.filter((n: any) => !n.isRead).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 border border-slate-900 text-white rounded-full text-[8px] font-extrabold min-w-4 h-4 px-1 flex items-center justify-center">
                  {notifications.filter((n: any) => !n.isRead).length}
                </span>
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-bold text-slate-400 bg-slate-800/80 hover:bg-slate-800 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-slate-700/50 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab content Scroll Box */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          
          {/* Home Tab */}
          {currentTab === 'home' && (
            <div className="space-y-4">
              {/* Daily Rates */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[9px] font-extrabold text-emerald-500 tracking-widest block mb-3 uppercase">
                  🥛 Today's Farm rates
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                    <p className="text-[9px] text-slate-500">🐄 Cow</p>
                    <p className="text-sm font-extrabold text-slate-200 mt-0.5">₹{cowRate}/L</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                    <p className="text-[9px] text-slate-500">🐼 Buffalo</p>
                    <p className="text-sm font-extrabold text-slate-200 mt-0.5">₹{buffaloRate}/L</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                    <p className="text-[9px] text-slate-500">🐼⭐ Premium</p>
                    <p className="text-sm font-extrabold text-slate-200 mt-0.5">₹{buffaloPremiumRate}/L</p>
                  </div>
                </div>
              </div>

              {/* Quick actions grid */}
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center text-center transition-all"
                >
                  <span className="text-2xl mb-1.5">⚡</span>
                  <span className="text-xs font-bold text-slate-300">Book Instantly</span>
                </button>
                <button 
                  onClick={() => setIsSubscribeOpen(true)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center text-center transition-all"
                >
                  <span className="text-2xl mb-1.5">📅</span>
                  <span className="text-xs font-bold text-slate-300">Subscribe Daily</span>
                </button>
                <button 
                  onClick={() => setIsSellingOpen(true)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center text-center transition-all"
                >
                  <span className="text-2xl mb-1.5">🐄</span>
                  <span className="text-xs font-bold text-slate-300">Sell Cattle</span>
                </button>
                <button 
                  onClick={() => setIsSupportOpen(true)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col items-center text-center transition-all"
                >
                  <span className="text-2xl mb-1.5">💬</span>
                  <span className="text-xs font-bold text-slate-300">Help Support</span>
                </button>
              </div>

              {/* Recent Deliveries */}
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Recent deliveries</h3>
              <div className="space-y-2.5">
                {deliveries.length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-4 bg-slate-900/10 border border-slate-900 rounded-xl">No delivery entries logged yet.</p>
                ) : (
                  deliveries.slice(0, 5).map(del => (
                    <div key={del.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-350">{del.morning}</p>
                        <p className="text-[9px] text-slate-500">{del.date}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-450">Delivered ✔</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Subscribe Tab */}
          {currentTab === 'subscribe' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Daily Subscriptions</h3>
                <button 
                  onClick={() => setIsSubscribeOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  + Add New
                </button>
              </div>

              {subscriptions.map(sub => (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <h4 className="font-bold text-slate-200">
                        {sub.type === 'cow' ? '🐄 Cow Milk' : '🐼 Buffalo Milk'}
                      </h4>
                      <p className="text-[9px] text-slate-500">Volume: {sub.qty}L | Shift: {sub.shift}</p>
                    </div>
                    <span className={`text-[9.5px] font-bold uppercase rounded px-2 py-0.5 ${
                      sub.status === 'active' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-slate-950 text-slate-400 border border-slate-850'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {sub.status === 'active' && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetchFromBackend(`/api/subscriptions/${sub.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'paused' })
                            });
                            showAlert('Paused', 'Subscription is paused.');
                            loadAllData();
                          } catch (err) {
                            showAlert('Error', 'Failed to pause subscription.');
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-bold py-2 rounded-xl flex-1 border border-slate-700/50 transition-all"
                      >
                        Pause
                      </button>
                    )}
                    {sub.status === 'paused' && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetchFromBackend(`/api/subscriptions/${sub.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'active' })
                            });
                            showAlert('Resumed', 'Subscription is active.');
                            loadAllData();
                          } catch (err) {
                            showAlert('Error', 'Failed to resume subscription.');
                          }
                        }}
                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-[10px] font-bold py-2 rounded-xl flex-1 transition-all"
                      >
                        Resume
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetchFromBackend(`/api/subscriptions/${sub.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'cancelled' })
                            });
                            showAlert('Cancelled', 'Subscription cancelled.');
                            loadAllData();
                          } catch (err) {
                            showAlert('Error', 'Failed to cancel subscription.');
                          }
                        }}
                        className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-[10px] font-bold px-3 py-2 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Logs Tab */}
          {currentTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Daily Delivery History</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800">
                <span className="text-xs font-bold text-slate-400 block pb-2.5">June 2026 Ledger</span>
                {deliveries.map((del, i) => (
                  <div key={del.id} className={`flex justify-between items-center text-xs py-3 ${i === 0 ? 'pt-3' : ''}`}>
                    <span className="text-slate-450">{del.date}</span>
                    <span className="font-bold text-slate-200">{del.morning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {currentTab === 'calendar' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Monthly Consumption View</h3>
              {renderCalendar(loggedInCustomerId)}
            </div>
          )}

          {/* Billing Tab */}
          {currentTab === 'billing' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Monthly Statements</h3>
              
              {bills.map(bill => (
                <div key={bill.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <h4 className="font-bold text-slate-200">{bill.month}</h4>
                      <p className="text-[9px] text-slate-500">Volume consumed: {bill.totalQty}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${bill.status === 'paid' ? 'text-emerald-450' : 'text-red-400'}`}>
                      {bill.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-200">Total Due: ₹{bill.grandTotal}</p>

                  <div className="flex gap-2 pt-1 border-t border-slate-800/30">
                    {bill.status === 'pending' && (
                      <button 
                        onClick={async () => {
                          try {
                            await fetchFromBackend('/api/payments', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customerId: loggedInCustomerId,
                                amount: bill.grandTotal,
                                date: new Date().toISOString().split('T')[0],
                                status: 'paid',
                                method: 'upi',
                                note: `Paid ${bill.month} bill via mobile app simulation`
                              })
                            });
                            showAlert('Payment Successful 🎉', `Your payment of ₹${bill.grandTotal} has been recorded.`);
                            loadAllData();
                          } catch (err) {
                            showAlert('Error', 'Failed to submit payment.');
                          }
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-xl flex-1 transition-all shadow-md shadow-emerald-500/10"
                      >
                        Pay Now
                      </button>
                    )}
                    <button 
                      onClick={() => showAlert('Download 📈', `PDF Invoice URL:\n${bill.pdf}`)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-bold px-3 py-2 rounded-xl border border-slate-700/50 transition-all"
                    >
                      PDF Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Customer Navigation Footer tabs */}
        <div className="bg-slate-900 border-t border-slate-800 py-2.5 px-3 flex justify-between items-center shrink-0">
          <button 
            onClick={() => setCurrentTab('home')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${currentTab === 'home' ? 'text-emerald-450' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-base">🏠</span>
            <span className="text-[8px] font-bold">Home</span>
          </button>
          <button 
            onClick={() => setCurrentTab('subscribe')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${currentTab === 'subscribe' ? 'text-emerald-450' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-base">📅</span>
            <span className="text-[8px] font-bold">Subscribe</span>
          </button>
          <button 
            onClick={() => setCurrentTab('logs')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${currentTab === 'logs' ? 'text-emerald-450' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-base">📊</span>
            <span className="text-[8px] font-bold">History</span>
          </button>
          <button 
            onClick={() => setCurrentTab('calendar')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${currentTab === 'calendar' ? 'text-emerald-450' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-base">📅</span>
            <span className="text-[8px] font-bold">Calendar</span>
          </button>
          <button 
            onClick={() => setCurrentTab('billing')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${currentTab === 'billing' ? 'text-emerald-450' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="text-base">💳</span>
            <span className="text-[8px] font-bold">Billing</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    // Responsive layout mockup container
    <div className={`min-h-screen ${theme} flex items-center justify-center p-0 xl:p-6 overflow-x-hidden relative bg-slate-950`}>
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none hidden xl:block"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none hidden xl:block"></div>

      {/* Device frame container */}
      <div className="w-full h-screen xl:h-[820px] xl:w-[390px] bg-slate-900 xl:rounded-[44px] xl:border-[7px] xl:border-slate-800 phone-shadow flex flex-col overflow-hidden relative">
        {/* Notch on desktop mockup */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-5 bg-slate-800 rounded-b-2xl z-50 hidden xl:flex items-center justify-center gap-1.5">
          <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
          <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
        </div>

        {/* Display Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden pt-0 xl:pt-4">
          {renderAppContent()}
        </div>

        {/* --- DYNAMIC CUSTOM OVERLAYS (MODALS) --- */}

        {/* CUSTOM ALERT POPUP */}
        {customAlert && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100] animate-fade-in">
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 w-full max-w-[280px] text-center space-y-4 shadow-xl">
              <h3 className="font-extrabold text-sm text-slate-100">{customAlert.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{customAlert.message}</p>
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition-all"
              >
                Okay
              </button>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRM POPUP */}
        {customConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 w-full max-w-[280px] text-center space-y-4 shadow-xl">
              <h3 className="font-extrabold text-sm text-slate-100">{customConfirm.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{customConfirm.message}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCustomConfirm(null)}
                  className="flex-1 bg-slate-805 hover:bg-slate-800 text-slate-400 font-bold py-2 rounded-xl text-xs border border-slate-700/50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className="flex-1 bg-red-650 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS SLIDE OVERLAY (Customer) */}
        {isNotificationsOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[80%] flex flex-col p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-200">Alert Notifications</h3>
                <button 
                  onClick={async () => {
                    try {
                      await Promise.all(
                        notifications
                          .filter((n: any) => !n.isRead)
                          .map((n: any) => fetchFromBackend(`/api/notifications/${n.id}/read`, { method: 'PUT' }))
                      );
                      showAlert('Success', 'All notifications marked as read.');
                      loadAllData();
                    } catch (err) {
                      console.error('Failed to mark notifications read:', err);
                    }
                  }}
                  className="text-xs font-bold text-emerald-450"
                >
                  Mark all read
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">No notifications yet</p>
                ) : (
                  notifications.map((notif: any) => (
                    <button 
                      key={notif.id} 
                      onClick={async () => {
                        if (!notif.isRead) {
                          try {
                            await fetchFromBackend(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
                            loadAllData();
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        showAlert(notif.title, notif.message);
                      }}
                      className={`w-full text-left p-3 rounded-xl border flex gap-3 items-start transition-all ${
                        notif.isRead 
                          ? 'bg-slate-950/40 border-slate-900 text-slate-400' 
                          : 'bg-emerald-950/20 border-emerald-900/40 text-slate-200'
                      }`}
                    >
                      <span className="text-base mt-0.5">{notif.type === 'bill' ? '🥛' : '⚡'}</span>
                      <div className="flex-1 text-xs">
                        <p className="font-bold">{notif.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{notif.message}</p>
                        <p className="text-[8px] text-slate-600 mt-1">
                          {notif.sentAt ? `${new Date(notif.sentAt).toLocaleDateString()} ${new Date(notif.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                      {!notif.isRead && <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></span>}
                    </button>
                  ))
                )}
              </div>

              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-705 border border-slate-700/50 text-slate-350 font-bold py-2.5 rounded-xl text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* 1. SUBSCRIBE OVERLAY */}
        {isSubscribeOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end animate-slide-up">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[90%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Schedule Daily Subscription</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">CATTLE MILK TYPE</label>
                  <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
                    <button 
                      onClick={() => setSubType('cow')}
                      className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${
                        subType === 'cow' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Cow Milk
                    </button>
                    <button 
                      onClick={() => setSubType('buffalo')}
                      className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${
                        subType === 'buffalo' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Buffalo Milk
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">DAILY VOLUME (LITRES)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-250 focus:outline-none"
                    value={subQty}
                    onChange={(e) => setSubQty(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">SHIFT SCHEDULE</label>
                  <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
                    <button 
                      onClick={() => setSubShift('morning')}
                      className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${
                        subShift === 'morning' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Morning
                    </button>
                    <button 
                      onClick={() => setSubShift('evening')}
                      className={`flex-1 text-xs py-1.5 font-bold rounded-lg transition-all ${
                        subShift === 'evening' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Evening
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsSubscribeOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubscribe}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  Confirm Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. BOOK EXPRESS OVERLAY */}
        {isBookingOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Express Booking Order</h3>

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">CATTLE MILK TYPE</label>
                  <button 
                    onClick={() => setShowBookTypeDropdown(!showBookTypeDropdown)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-left text-slate-300 flex justify-between items-center"
                  >
                    <span>{bookType === 'cow' ? 'Cow Milk' : 'Buffalo Milk'}</span>
                    <span className="text-[8px] text-slate-500">▼</span>
                  </button>
                  
                  {showBookTypeDropdown && (
                    <div className="absolute left-0 right-0 top-[52px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden z-[110]">
                      <button 
                        onClick={() => { setBookType('cow'); setShowBookTypeDropdown(false); }}
                        className="w-full text-left text-xs text-slate-350 px-4 py-2 hover:bg-slate-900"
                      >
                        Cow Milk
                      </button>
                      <button 
                        onClick={() => { setBookType('buffalo'); setShowBookTypeDropdown(false); }}
                        className="w-full text-left text-xs text-slate-350 px-4 py-2 hover:bg-slate-900 border-t border-slate-900"
                      >
                        Buffalo Milk
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ORDER QUANTITY (LITRES)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    value={bookQty}
                    onChange={(e) => setBookQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setIsBookingOpen(false); setShowBookTypeDropdown(false); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBook}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  Place Order Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. SELL CATTLE OVERLAY */}
        {isSellingOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[95%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Post Cattle Marketplace Ad</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ANIMAL TYPE</label>
                  <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
                    <button 
                      onClick={() => setSellType('cow')}
                      className={`flex-1 py-1 font-bold rounded-lg transition-all ${
                        sellType === 'cow' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Cow
                    </button>
                    <button 
                      onClick={() => setSellType('buffalo')}
                      className={`flex-1 py-1 font-bold rounded-lg transition-all ${
                        sellType === 'buffalo' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Buffalo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">CATTLE BREED</label>
                  <input 
                    type="text"
                    placeholder="e.g. Sahiwal or Murrah"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                    value={sellBreed}
                    onChange={(e) => setSellBreed(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">PRICE (₹)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 50000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">DAILY YIELD (L)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 12"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                      value={sellYield}
                      onChange={(e) => setSellYield(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">LOCATION</label>
                  <input 
                    type="text"
                    placeholder="e.g. Noida, Uttar Pradesh"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none"
                    value={sellLocation}
                    onChange={(e) => setSellLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsSellingOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSell}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  Post Advertisement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. HELP SUPPORT OVERLAY */}
        {isSupportOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Submit Support Inquiry</h3>
              
              <div>
                <label className="text-[9px] font-bold text-slate-500 block mb-1.5">QUERY DETAILS</label>
                <textarea 
                  rows={4}
                  placeholder="How can we help you? e.g. Request extra morning milk, adjust ledger discrepancy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                  value={supportMsg}
                  onChange={(e) => setSupportMsg(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsSupportOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSupportSubmit}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  Submit Inquiry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. ADMIN REGISTER CUSTOMER OVERLAY */}
        {isAddCustOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end animate-slide-up">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Register New Customer</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">FULL NAME</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">MOBILE NUMBER</label>
                    <input 
                      type="tel"
                      className="w-full bg-slate-950 border border-slate-855 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                      value={newCustMobile}
                      onChange={(e) => setNewCustMobile(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">BILLING LEDGER</label>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        onClick={() => setNewCustType('monthly')}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          newCustType === 'monthly' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Monthly
                      </button>
                      <button 
                        onClick={() => setNewCustType('prepaid')}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          newCustType === 'prepaid' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Prepaid
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ADDRESS</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                  />
                </div>

                {/* Cow Milk Subscription Section */}
                <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40 space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-450 flex items-center gap-1">
                      <span>🐄</span> Cow Milk Subscription
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">COW RATE (₹)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustCowRate}
                        onChange={(e) => setNewCustCowRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">MORN QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustCowMorningQty}
                        onChange={(e) => setNewCustCowMorningQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">EVE QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustCowEveningQty}
                        onChange={(e) => setNewCustCowEveningQty(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Buffalo Milk Subscription Section */}
                <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40 space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-450 flex items-center gap-1">
                      <span>🐃</span> Buffalo Milk Subscription
                    </span>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        type="button"
                        onClick={() => {
                          setNewCustBuffaloTier('standard');
                          setNewCustBuffaloRate(buffaloRate);
                        }}
                        className={`text-[8.5px] px-2 py-0.5 font-bold rounded transition-all ${
                          newCustBuffaloTier === 'standard' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Std
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setNewCustBuffaloTier('premium');
                          setNewCustBuffaloRate(buffaloPremiumRate);
                        }}
                        className={`text-[8.5px] px-2 py-0.5 font-bold rounded transition-all ${
                          newCustBuffaloTier === 'premium' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Prem
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">BUFF RATE (₹)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustBuffaloRate}
                        onChange={(e) => setNewCustBuffaloRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">MORN QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustBuffaloMorningQty}
                        onChange={(e) => setNewCustBuffaloMorningQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">EVE QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={newCustBuffaloEveningQty}
                        onChange={(e) => setNewCustBuffaloEveningQty(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">OPENING BALANCE (₹)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 500"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={newCustBalance}
                    onChange={(e) => setNewCustBalance(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsAddCustOpen(false)}
                  disabled={registeringCustomer}
                  className={`flex-1 bg-slate-800 text-slate-450 font-bold py-2 rounded-xl text-xs transition-all border border-slate-700/50 ${
                    registeringCustomer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-705 text-slate-450'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCustomer}
                  disabled={registeringCustomer}
                  className={`flex-1 bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    registeringCustomer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'
                  }`}
                >
                  {registeringCustomer ? (
                    <>
                      <span className="custom-spinner"></span>
                      <span>Registering...</span>
                    </>
                  ) : (
                    'Register Profile'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. ADMIN EDIT CUSTOMER OVERLAY */}
        {isEditCustOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Update Customer settings</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">NAME</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={editCustName}
                    onChange={(e) => setEditCustName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">MOBILE</label>
                    <input 
                      type="tel"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                      value={editCustMobile}
                      onChange={(e) => setEditCustMobile(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">LEDGER MODE</label>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        onClick={() => setEditCustType('monthly')}
                        className={`flex-1 text-[9.5px] py-1 font-bold rounded transition-all ${
                          editCustType === 'monthly' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Monthly
                      </button>
                      <button 
                        onClick={() => setEditCustType('prepaid')}
                        className={`flex-1 text-[9.5px] py-1 font-bold rounded transition-all ${
                          editCustType === 'prepaid' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Prepaid
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ADDRESS</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={editCustAddress}
                    onChange={(e) => setEditCustAddress(e.target.value)}
                  />
                </div>

                {/* Cow Milk Subscription Section */}
                <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40 space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-450 flex items-center gap-1">
                      <span>🐄</span> Cow Milk Subscription
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">COW RATE (₹)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustCowRate}
                        onChange={(e) => setEditCustCowRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">MORN QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustCowMorningQty}
                        onChange={(e) => setEditCustCowMorningQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">EVE QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustCowEveningQty}
                        onChange={(e) => setEditCustCowEveningQty(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Buffalo Milk Subscription Section */}
                <div className="border border-slate-800 rounded-2xl p-3 bg-slate-950/40 space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-450 flex items-center gap-1">
                      <span>🐃</span> Buffalo Milk Subscription
                    </span>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        type="button"
                        onClick={() => {
                          setEditCustBuffaloTier('standard');
                          setEditCustBuffaloRate(buffaloRate);
                        }}
                        className={`text-[8.5px] px-2 py-0.5 font-bold rounded transition-all ${
                          editCustBuffaloTier === 'standard' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Std
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditCustBuffaloTier('premium');
                          setEditCustBuffaloRate(buffaloPremiumRate);
                        }}
                        className={`text-[8.5px] px-2 py-0.5 font-bold rounded transition-all ${
                          editCustBuffaloTier === 'premium' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Prem
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">BUFF RATE (₹)</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustBuffaloRate}
                        onChange={(e) => setEditCustBuffaloRate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">MORN QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustBuffaloMorningQty}
                        onChange={(e) => setEditCustBuffaloMorningQty(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-bold text-slate-500 block mb-0.5">EVE QTY (L)</label>
                      <input 
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-1 text-slate-200 text-center text-xs focus:outline-none"
                        value={editCustBuffaloEveningQty}
                        onChange={(e) => setEditCustBuffaloEveningQty(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ADJUST BALANCE (₹)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={editCustBalance}
                    onChange={(e) => setEditCustBalance(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ACCOUNT STATUS</label>
                  <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                    {['active', 'paused', 'inactive'].map(st => (
                      <button 
                        key={st}
                        onClick={() => setEditCustStatus(st as any)}
                        className={`flex-1 text-[9.5px] py-1 font-bold rounded uppercase transition-all ${
                          editCustStatus === st ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setIsEditCustOpen(false); setSelectedCustomer(null); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditCustomer}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. ADMIN CUSTOMER CALENDAR LOG OVERLAY */}
        {isCustCalendarOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end animate-slide-up">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] flex flex-col">
              <h3 className="font-bold text-sm text-slate-250 border-b border-slate-800 pb-2 shrink-0">
                Delivery Calendar Log: {selectedCustCalendar?.name}
              </h3>
              <div className="flex-1 overflow-y-auto pr-0.5 pb-2">
                {selectedCustCalendar && renderCalendar(selectedCustCalendar.id)}
              </div>
              <button 
                onClick={() => { setIsCustCalendarOpen(false); setSelectedCustCalendar(null); }}
                className="w-full bg-slate-800 hover:bg-slate-705 text-red-400 font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-700/50 shrink-0"
              >
                Close Calendar Log
              </button>
            </div>
          </div>
        )}

        {/* ADMIN EDIT DAILY DELIVERY LOG OVERLAY */}
        {isEditEntryOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end animate-slide-up text-left">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Correct/Update Daily Delivery</h3>
              
              <div className="space-y-3 text-xs text-left">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">CUSTOMER</label>
                  <p className="text-sm font-bold text-slate-300">
                    {allCustomers.find(c => c.id === editEntryCustId)?.name || 'Monthly Customer'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">CATTLE MILK</label>
                    <p className="text-xs font-semibold text-slate-405 uppercase">
                      {editEntryMilkType === 'cow' ? '🐄 Cow' : '🐼 Buffalo'} Milk
                    </p>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">SHIFT / DATE</label>
                    <p className="text-xs font-semibold text-slate-405">
                      {editEntryShift.toUpperCase()} • {editEntryDate}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">QUANTITY (LITRES)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none text-center font-bold"
                      value={editEntryQty}
                      onChange={(e) => setEditEntryQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">RATE (₹/L)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none text-center font-bold"
                      value={editEntryRate}
                      onChange={(e) => setEditEntryRate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">NOTES</label>
                  <input 
                    type="text"
                    placeholder="e.g. Quantity variation correction"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={editEntryNote}
                    onChange={(e) => setEditEntryNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setIsEditEntryOpen(false); setEditEntryId(''); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditEntry}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. ADMIN LOG SINGLE DELIVERY OVERLAY */}
        {isAddEntryOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Log Daily Delivery</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">SELECT CUSTOMER</label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {allCustomers.map(cust => (
                      <button 
                        key={cust.id} 
                        onClick={() => {
                          setEntryCustId(cust.id);
                          setEntryMilkType(cust.milkType);
                          setEntryBuffaloTier(cust.buffaloTier || 'standard');
                          setEntryRate(String(cust.rate));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${
                          entryCustId === cust.id 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                            : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-slate-300'
                        }`}
                      >
                        {cust.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">CATTLE MILK</label>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        onClick={() => {
                          setEntryMilkType('cow');
                          const cust = allCustomers.find(c => c.id === entryCustId);
                          if (cust) {
                            if (cust.milkType === 'cow') {
                              setEntryRate(String(cust.rate));
                            } else {
                              setEntryRate(cowRate);
                            }
                          } else {
                            setEntryRate(cowRate);
                          }
                        }}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          entryMilkType === 'cow' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Cow
                      </button>
                      <button 
                        onClick={() => {
                          setEntryMilkType('buffalo');
                          const cust = allCustomers.find(c => c.id === entryCustId);
                          if (cust) {
                            const tier = cust.buffaloTier || 'standard';
                            setEntryBuffaloTier(tier);
                            if (cust.milkType === 'buffalo') {
                              setEntryRate(String(cust.rate));
                            } else {
                              setEntryRate(tier === 'premium' ? buffaloPremiumRate : buffaloRate);
                            }
                          } else {
                            setEntryRate(buffaloRate);
                            setEntryBuffaloTier('standard');
                          }
                        }}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          entryMilkType === 'buffalo' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Buffalo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">SHIFT</label>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        onClick={() => setEntryShift('morning')}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          entryShift === 'morning' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Morning
                      </button>
                      <button 
                        onClick={() => setEntryShift('evening')}
                        className={`flex-1 text-[9px] py-1 font-bold rounded transition-all ${
                          entryShift === 'evening' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Evening
                      </button>
                    </div>
                  </div>
                </div>

                {entryMilkType === 'buffalo' && (
                  <div className="bg-slate-950/40 p-2.5 border border-slate-850/60 rounded-xl space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 block">BUFFALO TYPE</label>
                    <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                      <button 
                        type="button"
                        onClick={() => {
                          setEntryBuffaloTier('standard');
                          const cust = allCustomers.find(c => c.id === entryCustId);
                          if (cust && cust.milkType === 'buffalo' && cust.buffaloTier === 'standard') {
                            setEntryRate(String(cust.rate));
                          } else {
                            setEntryRate(buffaloRate);
                          }
                        }}
                        className={`flex-1 text-[9px] py-1.5 font-bold rounded transition-all ${
                          entryBuffaloTier === 'standard' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Standard (Plain)
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setEntryBuffaloTier('premium');
                          const cust = allCustomers.find(c => c.id === entryCustId);
                          if (cust && cust.milkType === 'buffalo' && cust.buffaloTier === 'premium') {
                            setEntryRate(String(cust.rate));
                          } else {
                            setEntryRate(buffaloPremiumRate);
                          }
                        }}
                        className={`flex-1 text-[9px] py-1.5 font-bold rounded transition-all ${
                          entryBuffaloTier === 'premium' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                        }`}
                      >
                        Premium
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">QUANTITY (LITRES)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none text-center"
                      value={entryQty}
                      onChange={(e) => setEntryQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">RATE (₹/L)</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none text-center"
                      value={entryRate}
                      onChange={(e) => setEntryRate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">DELIVERY DATE</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">NOTES</label>
                  <input 
                    type="text"
                    placeholder="e.g. Extra milk request"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
                    value={entryNote}
                    onChange={(e) => setEntryNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsAddEntryOpen(false)}
                  disabled={loggingEntry}
                  className={`flex-1 bg-slate-800 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all border border-slate-700/50 ${
                    loggingEntry ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-705'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEntry}
                  disabled={loggingEntry}
                  className={`flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    loggingEntry ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'
                  }`}
                >
                  {loggingEntry ? (
                    <>
                      <span className="custom-spinner"></span>
                      <span>Recording...</span>
                    </>
                  ) : (
                    'Record Entry'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. ADMIN ANNOUNCEMENT OVERLAY */}
        {isAnnouncementOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Broadcast Alert Announcement</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">ALERT TITLE</label>
                  <input 
                    type="text"
                    placeholder="e.g. Festival timings adjust"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">BODY MESSAGE</label>
                  <textarea 
                    rows={3}
                    placeholder="Write announcement details..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAnnouncementOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendAnnouncement}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  Send Broadcast
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10. ADMIN WALK-IN CASH SALE OVERLAY */}
        {isCashSaleOpen && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto animate-slide-up">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Log Walk-in Cash Sale</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">SALE DATE</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                    value={cashSaleDate}
                    onChange={(e) => setCashSaleDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">MILK CATEGORY</label>
                  <div className="flex bg-slate-950 p-0.5 border border-slate-850 rounded-lg">
                    <button 
                      onClick={() => setCashSaleMilkType('cow')}
                      className={`flex-1 text-[9px] py-1.5 font-bold rounded transition-all ${
                        cashSaleMilkType === 'cow' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Cow (₹{cowRate})
                    </button>
                    <button 
                      onClick={() => setCashSaleMilkType('buffalo_standard')}
                      className={`flex-1 text-[9px] py-1.5 font-bold rounded transition-all ${
                        cashSaleMilkType === 'buffalo_standard' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Buff Std (₹{buffaloRate})
                    </button>
                    <button 
                      onClick={() => setCashSaleMilkType('buffalo_premium')}
                      className={`flex-1 text-[9px] py-1.5 font-bold rounded transition-all ${
                        cashSaleMilkType === 'buffalo_premium' ? 'bg-emerald-500 text-white' : 'text-slate-400'
                      }`}
                    >
                      Buff Prem (₹{buffaloPremiumRate})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">CASH RECEIVED (₹)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 50"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                    value={cashSaleAmount}
                    onChange={(e) => setCashSaleAmount(e.target.value)}
                  />
                </div>

                {cashSaleAmount && Number(cashSaleAmount) > 0 && (
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-emerald-400 font-bold leading-normal">
                      ₹{cashSaleAmount} ÷ ₹{
                        cashSaleMilkType === 'cow' ? cowRate
                          : cashSaleMilkType === 'buffalo_premium' ? buffaloPremiumRate
                          : buffaloRate
                      }/L = {(
                        Number(cashSaleAmount) / (
                          cashSaleMilkType === 'cow' ? Number(cowRate)
                            : cashSaleMilkType === 'buffalo_premium' ? Number(buffaloPremiumRate)
                            : Number(buffaloRate)
                        )
                      ).toFixed(2)}L Milk to give
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setIsCashSaleOpen(false); setCashSaleAmount(''); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-705 text-slate-450 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCashSale}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  Record Cash Sale
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
