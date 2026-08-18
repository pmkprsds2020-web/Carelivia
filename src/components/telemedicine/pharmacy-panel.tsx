'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import type { Medicine, MedicineCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  Pill,
  Package,
  Heart,
  Wrench,
  ShoppingBag,
  CreditCard,
  Truck,
} from 'lucide-react';

const CATEGORY_CONFIG: Record<MedicineCategory, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  resep: {
    label: 'Obat Resep',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <Pill className="w-4 h-4" />,
  },
  bebas: {
    label: 'Obat Bebas',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: <Package className="w-4 h-4" />,
  },
  vitamin: {
    label: 'Vitamin',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: <Heart className="w-4 h-4" />,
  },
  alat_kesehatan: {
    label: 'Alat Kesehatan',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: <Wrench className="w-4 h-4" />,
  },
};

const CATEGORY_FILTERS = [
  { key: '' as const, label: 'Semua' },
  { key: 'resep' as const, label: 'Obat Resep' },
  { key: 'bebas' as const, label: 'Obat Bebas' },
  { key: 'vitamin' as const, label: 'Vitamin' },
  { key: 'alat_kesehatan' as const, label: 'Alat Kesehatan' },
];

const SHIPPING_FEE = 15000;

function formatCurrency(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

function getStockStatus(stock: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (stock === 0) return { label: 'Habis', variant: 'destructive' };
  if (stock <= 10) return { label: 'Stok Rendah', variant: 'secondary' };
  return { label: 'Tersedia', variant: 'default' };
}

export function PharmacyPanel() {
  const { medicines, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, currentUser, setActivePanel, setPendingPaymentFocusId } = useStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('shop');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MedicineCategory | ''>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const filteredMedicines = useMemo(() => {
    let result = medicines;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.genericName && m.genericName.toLowerCase().includes(q)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
      );
    }

    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter);
    }

    return result;
  }, [medicines, searchQuery, categoryFilter]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.medicine.price * item.quantity, 0);
  }, [cart]);

  const cartTotal = cartSubtotal + SHIPPING_FEE;

  const getQuantity = (medicineId: string): number => {
    const cartItem = cart.find((c) => c.medicine.id === medicineId);
    if (cartItem) return cartItem.quantity;
    return quantities[medicineId] || 1;
  };

  const incrementQuantity = (medicineId: string, stock: number) => {
    const current = getQuantity(medicineId);
    if (current < stock) {
      const cartItem = cart.find((c) => c.medicine.id === medicineId);
      if (cartItem) {
        updateCartQuantity(medicineId, current + 1);
      } else {
        setQuantities((prev) => ({ ...prev, [medicineId]: current + 1 }));
      }
    }
  };

  const decrementQuantity = (medicineId: string) => {
    const current = getQuantity(medicineId);
    if (current > 1) {
      const cartItem = cart.find((c) => c.medicine.id === medicineId);
      if (cartItem) {
        updateCartQuantity(medicineId, current - 1);
      } else {
        setQuantities((prev) => ({ ...prev, [medicineId]: current - 1 }));
      }
    }
  };

  const handleAddToCart = (medicine: Medicine) => {
    const qty = quantities[medicine.id] || 1;
    addToCart({ medicine, quantity: qty });
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[medicine.id];
      return next;
    });
    toast({
      title: 'Ditambahkan ke Keranjang',
      description: `${medicine.name} (x${qty}) telah ditambahkan`,
    });
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      toast({ title: 'Silakan login', description: 'Anda harus login untuk checkout.', variant: 'destructive' });
      return;
    }
    if (cart.length === 0) return;
    if (isCheckingOut) return; // guard against double-submit

    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/pharmacy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          items: cart.map((item) => ({ medicineId: item.medicine.id, quantity: item.quantity })),
          shippingFee: SHIPPING_FEE,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.order) {
        throw new Error(data?.details || data?.error || 'Checkout gagal');
      }

      // The order + a pending payment now exist for real in Supabase — the
      // cart is only cleared AFTER that succeeds, so a failed checkout
      // never silently loses what was in the cart.
      clearCart();
      toast({
        title: 'Pesanan Dibuat',
        description: `Invoice ${data.payment.invoiceNumber} — silakan pilih metode pembayaran.`,
      });
      setActiveTab('shop');

      // Go straight to the payment method screen for this exact invoice
      // instead of leaving the patient to find it themselves in Pembayaran.
      if (data.payment?.id) {
        setPendingPaymentFocusId(data.payment.id);
      }
      setActivePanel('payments');
    } catch (err) {
      toast({
        title: 'Checkout Gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Belanja Obat
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex items-center gap-2 relative">
              <ShoppingCart className="w-4 h-4" />
              Keranjang
              {cart.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5">
                  {cart.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Belanja Obat */}
        <TabsContent value="shop" className="space-y-4 mt-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari obat, generic name, atau produsen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((filter) => (
              <Button
                key={filter.key}
                variant={categoryFilter === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(filter.key)}
                className="rounded-full"
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Medicine Grid */}
          {filteredMedicines.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Pill className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Tidak ada obat ditemukan</p>
                <p className="text-sm text-muted-foreground mt-1">Coba ubah kata kunci atau filter kategori</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMedicines.map((medicine) => {
                const config = CATEGORY_CONFIG[medicine.category];
                const stockStatus = getStockStatus(medicine.stock);
                const qty = getQuantity(medicine.id);
                const inCart = cart.some((c) => c.medicine.id === medicine.id);

                return (
                  <Card key={medicine.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    {/* Colored top section based on category */}
                    <div className={`${config.bgColor} ${config.borderColor} border-b px-4 py-3`}>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`${config.color} ${config.bgColor} ${config.borderColor} text-xs`}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                        <Badge variant={stockStatus.variant} className="text-xs">
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{medicine.name}</h3>
                        {medicine.genericName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{medicine.genericName}</p>
                        )}
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-lg font-bold text-primary">{formatCurrency(medicine.price)}</p>
                          {medicine.unit && (
                            <p className="text-xs text-muted-foreground">per {medicine.unit}</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => decrementQuantity(medicine.id)}
                            disabled={qty <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => incrementQuantity(medicine.id, medicine.stock)}
                            disabled={qty >= medicine.stock}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(medicine)}
                          disabled={medicine.stock === 0 || inCart}
                          className="gap-1"
                        >
                          {inCart ? (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Di Keranjang
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Tambah
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Keranjang */}
        <TabsContent value="cart" className="space-y-4 mt-0">
          {cart.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Keranjang Kosong</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Belum ada obat di keranjang Anda
                </p>
                <Button variant="outline" onClick={() => setActiveTab('shop')}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Mulai Belanja
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    Item di Keranjang ({cart.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Hapus Semua
                  </Button>
                </div>

                {cart.map((item) => {
                  const config = CATEGORY_CONFIG[item.medicine.category];
                  return (
                    <Card key={item.medicine.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Medicine info */}
                          <div className={`${config.bgColor} rounded-lg p-3 shrink-0`}>
                            {config.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium text-foreground text-sm">{item.medicine.name}</h4>
                                {item.medicine.genericName && (
                                  <p className="text-xs text-muted-foreground">{item.medicine.genericName}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFromCart(item.medicine.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm font-semibold text-primary">
                                {formatCurrency(item.medicine.price)}
                              </p>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.medicine.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateCartQuantity(item.medicine.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.medicine.stock}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                {item.medicine.unit && `per ${item.medicine.unit}`}
                              </p>
                              <p className="text-sm font-bold text-foreground">
                                Subtotal: {formatCurrency(item.medicine.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ringkasan Pesanan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal ({cart.length} item)</span>
                        <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          Ongkos Kirim
                        </span>
                        <span className="font-medium">{formatCurrency(SHIPPING_FEE)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>

                    <Button className="w-full gap-2" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
                      {isCheckingOut ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Checkout
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center">
                      Dengan melanjutkan, Anda menyetujui syarat dan ketentuan yang berlaku
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
