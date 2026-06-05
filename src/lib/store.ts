import { create } from 'zustand';
import type { 
  User, Consultation, Message, Medicine, CartItem, 
  HomeCareService, HomeCareBooking, Notification, Article,
  ActivePanel, DashboardStats, MedicalRecord, Payment
} from './types';

interface TelemedicineStore {
  // Navigation
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Dashboard
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats | null) => void;
  
  // Doctors
  doctors: User[];
  setDoctors: (doctors: User[]) => void;
  onlineDoctors: string[];
  setOnlineDoctors: (ids: string[]) => void;
  
  // Consultations
  consultations: Consultation[];
  setConsultations: (consultations: Consultation[]) => void;
  activeConsultation: Consultation | null;
  setActiveConsultation: (consultation: Consultation | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  typingUsers: Map<string, string[]>;
  setTypingUsers: (map: Map<string, string[]>) => void;
  
  // Pharmacy
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (medicineId: string) => void;
  updateCartQuantity: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Home Care
  homeCareServices: HomeCareService[];
  setHomeCareServices: (services: HomeCareService[]) => void;
  homeCareBookings: HomeCareBooking[];
  setHomeCareBookings: (bookings: HomeCareBooking[]) => void;
  
  // Medical Records
  medicalRecords: MedicalRecord[];
  setMedicalRecords: (records: MedicalRecord[]) => void;
  
  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  
  // Payments
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  
  // Articles
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  
  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedChatDoctor: User | null;
  setSelectedChatDoctor: (doctor: User | null) => void;
}

export const useStore = create<TelemedicineStore>((set) => ({
  // Navigation
  activePanel: 'home',
  setActivePanel: (panel) => set({ activePanel: panel }),
  
  // User
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Dashboard
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  
  // Doctors
  doctors: [],
  setDoctors: (doctors) => set({ doctors }),
  onlineDoctors: [],
  setOnlineDoctors: (ids) => set({ onlineDoctors: ids }),
  
  // Consultations
  consultations: [],
  setConsultations: (consultations) => set({ consultations }),
  activeConsultation: null,
  setActiveConsultation: (consultation) => set({ activeConsultation: consultation }),
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  typingUsers: new Map(),
  setTypingUsers: (map) => set({ typingUsers: map }),
  
  // Pharmacy
  medicines: [],
  setMedicines: (medicines) => set({ medicines }),
  cart: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.medicine.id === item.medicine.id);
    if (existing) {
      return {
        cart: state.cart.map(c => 
          c.medicine.id === item.medicine.id 
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        )
      };
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (medicineId) => set((state) => ({
    cart: state.cart.filter(c => c.medicine.id !== medicineId)
  })),
  updateCartQuantity: (medicineId, quantity) => set((state) => ({
    cart: state.cart.map(c => 
      c.medicine.id === medicineId ? { ...c, quantity } : c
    )
  })),
  clearCart: () => set({ cart: [] }),
  
  // Home Care
  homeCareServices: [],
  setHomeCareServices: (services) => set({ homeCareServices: services }),
  homeCareBookings: [],
  setHomeCareBookings: (bookings) => set({ homeCareBookings: bookings }),
  
  // Medical Records
  medicalRecords: [],
  setMedicalRecords: (records) => set({ medicalRecords: records }),
  
  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  // Payments
  payments: [],
  setPayments: (payments) => set({ payments }),
  
  // Articles
  articles: [],
  setArticles: (articles) => set({ articles }),
  
  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  selectedChatDoctor: null,
  setSelectedChatDoctor: (doctor) => set({ selectedChatDoctor: doctor }),
}));
