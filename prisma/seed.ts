import "dotenv/config";
import bcrypt from "bcryptjs";
import { addDays, format, set as setDateFields, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import {
  UserRole,
  UserStatus,
  ProductStatus,
  CustomerStatus,
  ShiftStatus,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  StockMovementType,
  CashMovementType,
  RestockStatus,
  ActivityAction,
} from "@/app/generated/prisma/client";
import {
  calculateSaleTotals,
  calculateChange,
  calculateUnpaidAmount,
  calculatePaymentStatus,
  roundMoney,
  toNumber,
} from "@/lib/pos/money";
import { calculateExpectedCash } from "@/lib/pos/shift";
import { generateSaleNumber, generateRestockOrderNumber } from "@/lib/pos/sale-number";
import { generateReceiptNumber } from "@/lib/pos/receipt-number";

const PASSWORD = "Password123!";

const NOW = new Date();
const TODAY = startOfDay(NOW);

function daysAgo(n: number): Date {
  return addDays(TODAY, -n);
}

function at(date: Date, hour: number, minute: number): Date {
  return setDateFields(date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
}

const saleSeq: Record<string, number> = {};
const receiptSeq: Record<string, number> = {};
const restockSeq: Record<string, number> = {};

function nextSaleNumber(date: Date): string {
  const key = format(date, "yyyy-MM-dd");
  saleSeq[key] = (saleSeq[key] ?? 0) + 1;
  return generateSaleNumber(date, saleSeq[key]);
}

function nextReceiptNumber(date: Date): string {
  const key = format(date, "yyyy-MM-dd");
  receiptSeq[key] = (receiptSeq[key] ?? 0) + 1;
  return generateReceiptNumber(date, receiptSeq[key]);
}

function nextRestockNumber(date: Date): string {
  const key = format(date, "yyyy-MM-dd");
  restockSeq[key] = (restockSeq[key] ?? 0) + 1;
  return generateRestockOrderNumber(date, restockSeq[key]);
}

const CATEGORY_DEFS = [
  { name: "Minuman", slug: "minuman" },
  { name: "Makanan Ringan", slug: "makanan-ringan" },
  { name: "Sembako", slug: "sembako" },
  { name: "Perawatan Diri", slug: "perawatan-diri" },
  { name: "Alat Tulis", slug: "alat-tulis" },
  { name: "Produk Dingin", slug: "produk-dingin" },
  { name: "Kopi & Teh", slug: "kopi-teh" },
] as const;

type CategorySlug = (typeof CATEGORY_DEFS)[number]["slug"];

type ProductDef = {
  sku: string;
  name: string;
  categorySlug: CategorySlug;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  initialStock: number;
};

const PRODUCT_DEFS: ProductDef[] = [
  { sku: "SKU-001", name: "Air Mineral 600ml", categorySlug: "minuman", costPrice: 2500, sellingPrice: 4000, minStock: 20, initialStock: 140 },
  { sku: "SKU-002", name: "Air Mineral 1.5L", categorySlug: "minuman", costPrice: 4500, sellingPrice: 7000, minStock: 15, initialStock: 95 },
  { sku: "SKU-003", name: "Teh Botol", categorySlug: "minuman", costPrice: 4000, sellingPrice: 6000, minStock: 15, initialStock: 75 },
  { sku: "SKU-004", name: "Kopi Sachet", categorySlug: "kopi-teh", costPrice: 1200, sellingPrice: 2000, minStock: 30, initialStock: 220 },
  { sku: "SKU-005", name: "Kopi Susu Botol", categorySlug: "kopi-teh", costPrice: 6000, sellingPrice: 10000, minStock: 10, initialStock: 18 },
  { sku: "SKU-006", name: "Mie Instan Goreng", categorySlug: "makanan-ringan", costPrice: 2800, sellingPrice: 3500, minStock: 25, initialStock: 165 },
  { sku: "SKU-007", name: "Mie Instan Soto", categorySlug: "makanan-ringan", costPrice: 2800, sellingPrice: 3500, minStock: 25, initialStock: 155 },
  { sku: "SKU-008", name: "Beras 5kg", categorySlug: "sembako", costPrice: 62000, sellingPrice: 68000, minStock: 5, initialStock: 9 },
  { sku: "SKU-009", name: "Gula 1kg", categorySlug: "sembako", costPrice: 13000, sellingPrice: 16000, minStock: 10, initialStock: 55 },
  { sku: "SKU-010", name: "Minyak Goreng 1L", categorySlug: "sembako", costPrice: 15000, sellingPrice: 18000, minStock: 10, initialStock: 50 },
  { sku: "SKU-011", name: "Telur 1kg", categorySlug: "sembako", costPrice: 24000, sellingPrice: 28000, minStock: 8, initialStock: 34 },
  { sku: "SKU-012", name: "Roti Coklat", categorySlug: "makanan-ringan", costPrice: 6000, sellingPrice: 9000, minStock: 8, initialStock: 6 },
  { sku: "SKU-013", name: "Susu UHT", categorySlug: "produk-dingin", costPrice: 5500, sellingPrice: 8000, minStock: 12, initialStock: 65 },
  { sku: "SKU-014", name: "Sabun Mandi", categorySlug: "perawatan-diri", costPrice: 3500, sellingPrice: 5500, minStock: 15, initialStock: 75 },
  { sku: "SKU-015", name: "Shampoo Sachet", categorySlug: "perawatan-diri", costPrice: 500, sellingPrice: 1000, minStock: 50, initialStock: 320 },
  { sku: "SKU-016", name: "Pasta Gigi", categorySlug: "perawatan-diri", costPrice: 6500, sellingPrice: 9500, minStock: 10, initialStock: 45 },
  { sku: "SKU-017", name: "Pulpen", categorySlug: "alat-tulis", costPrice: 1500, sellingPrice: 2500, minStock: 20, initialStock: 110 },
  { sku: "SKU-018", name: "Buku Tulis", categorySlug: "alat-tulis", costPrice: 2500, sellingPrice: 4000, minStock: 20, initialStock: 95 },
  { sku: "SKU-019", name: "Keripik Kentang", categorySlug: "makanan-ringan", costPrice: 7000, sellingPrice: 11000, minStock: 10, initialStock: 38 },
  { sku: "SKU-020", name: "Biskuit Coklat", categorySlug: "makanan-ringan", costPrice: 5000, sellingPrice: 8000, minStock: 12, initialStock: 58 },
];

type SupplierDef = { name: string; contactName: string; phone: string };

const SUPPLIER_DEFS: SupplierDef[] = [
  { name: "PT Sinar Sembako Nusantara", contactName: "Hendra Kusnadi", phone: "021-5550101" },
  { name: "CV Minuman Segar Jaya", contactName: "Lina Marlina", phone: "021-5550102" },
  { name: "UD Kopi Nikmat", contactName: "Bambang Sutrisno", phone: "021-5550103" },
  { name: "PT Sumber Rejeki Distribusi", contactName: "Rudi Hartono", phone: "021-5550104" },
  { name: "CV Bersih Sehat Personal Care", contactName: "Yuni Astuti", phone: "021-5550105" },
];

type CustomerDef = {
  key: string;
  name: string;
  phone: string;
  status: CustomerStatus;
  creditLimit: number | null;
};

const CUSTOMER_DEFS: CustomerDef[] = [
  { key: "sari", name: "Sari Wulandari", phone: "0812-1111-0001", status: CustomerStatus.ACTIVE, creditLimit: null },
  { key: "budi", name: "Budi Santoso", phone: "0812-1111-0002", status: CustomerStatus.ACTIVE, creditLimit: 150000 },
  { key: "ani", name: "Ani Lestari", phone: "0812-1111-0003", status: CustomerStatus.ACTIVE, creditLimit: null },
  { key: "joko", name: "Joko Prasetyo", phone: "0812-1111-0004", status: CustomerStatus.ACTIVE, creditLimit: 100000 },
  { key: "rina", name: "Rina Kusuma", phone: "0812-1111-0005", status: CustomerStatus.ACTIVE, creditLimit: 200000 },
  { key: "dedi", name: "Dedi Firmansyah", phone: "0812-1111-0006", status: CustomerStatus.ACTIVE, creditLimit: null },
  { key: "maya", name: "Maya Anggraini", phone: "0812-1111-0007", status: CustomerStatus.INACTIVE, creditLimit: null },
  { key: "agus", name: "Agus Setiawan", phone: "0812-1111-0008", status: CustomerStatus.BLOCKED, creditLimit: null },
];

async function main() {
  console.log("Seeding KasirOne Pro demo data...");

  const store = await prisma.store.upsert({
    where: { slug: "toko-mandiri-mart" },
    update: {
      name: "Toko Mandiri Mart",
      address: "Jl. Merdeka No. 45, Kota Mandiri",
      phone: "021-5551234",
      email: "info@tokomandirimart.demo",
      receiptFooter: "Terima kasih sudah berbelanja di Toko Mandiri Mart.",
      currency: "IDR",
    },
    create: {
      name: "Toko Mandiri Mart",
      slug: "toko-mandiri-mart",
      address: "Jl. Merdeka No. 45, Kota Mandiri",
      phone: "021-5551234",
      email: "info@tokomandirimart.demo",
      receiptFooter: "Terima kasih sudah berbelanja di Toko Mandiri Mart.",
      currency: "IDR",
    },
  });

  await prisma.storeSetting.upsert({
    where: { storeId: store.id },
    update: {
      allowNegativeStock: false,
      taxEnabled: false,
      taxRate: 0,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
      receiptWidth: "80mm",
      receiptFooter: "Terima kasih sudah berbelanja di Toko Mandiri Mart.",
      lowStockAlertEnabled: true,
    },
    create: {
      storeId: store.id,
      allowNegativeStock: false,
      taxEnabled: false,
      taxRate: 0,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
      receiptWidth: "80mm",
      receiptFooter: "Terima kasih sudah berbelanja di Toko Mandiri Mart.",
      lowStockAlertEnabled: true,
    },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const USER_DEFS = [
    { email: "owner@kasirone.demo", name: "Andi Wijaya", role: UserRole.OWNER },
    { email: "manager@kasirone.demo", name: "Siti Rahma", role: UserRole.MANAGER },
    { email: "cashier@kasirone.demo", name: "Dewi Anjani", role: UserRole.CASHIER },
    { email: "inventory@kasirone.demo", name: "Fajar Nugroho", role: UserRole.INVENTORY_STAFF },
  ];

  const usersByRole: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};
  for (const u of USER_DEFS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, status: UserStatus.ACTIVE, password: passwordHash },
      create: { email: u.email, name: u.name, password: passwordHash, status: UserStatus.ACTIVE },
    });
    await prisma.storeMember.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      update: { role: u.role, isActive: true },
      create: { storeId: store.id, userId: user.id, role: u.role, isActive: true },
    });
    usersByRole[u.role] = user;
  }
  const owner = usersByRole[UserRole.OWNER];
  const manager = usersByRole[UserRole.MANAGER];
  const cashier = usersByRole[UserRole.CASHIER];
  const inventoryStaff = usersByRole[UserRole.INVENTORY_STAFF];

  const categoryBySlug: Record<string, Awaited<ReturnType<typeof prisma.category.upsert>>> = {};
  for (const c of CATEGORY_DEFS) {
    categoryBySlug[c.slug] = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: c.slug } },
      update: { name: c.name },
      create: { storeId: store.id, name: c.name, slug: c.slug },
    });
  }

  const productBySku: Record<string, Awaited<ReturnType<typeof prisma.product.upsert>>> = {};
  for (const p of PRODUCT_DEFS) {
    productBySku[p.sku] = await prisma.product.upsert({
      where: { storeId_sku: { storeId: store.id, sku: p.sku } },
      update: {
        name: p.name,
        categoryId: categoryBySlug[p.categorySlug].id,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.initialStock,
        minStock: p.minStock,
        unit: "pcs",
        status: ProductStatus.ACTIVE,
      },
      create: {
        storeId: store.id,
        categoryId: categoryBySlug[p.categorySlug].id,
        sku: p.sku,
        name: p.name,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stock: p.initialStock,
        minStock: p.minStock,
        unit: "pcs",
        status: ProductStatus.ACTIVE,
      },
    });
  }

  const suppliers: Awaited<ReturnType<typeof prisma.supplier.create>>[] = [];
  for (const s of SUPPLIER_DEFS) {
    let supplier = await prisma.supplier.findFirst({ where: { storeId: store.id, name: s.name } });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: { storeId: store.id, name: s.name, contactName: s.contactName, phone: s.phone, isActive: true },
      });
    }
    suppliers.push(supplier);
  }

  const customerByKey: Record<string, Awaited<ReturnType<typeof prisma.customer.create>>> = {};
  for (const c of CUSTOMER_DEFS) {
    let customer = await prisma.customer.findFirst({ where: { storeId: store.id, name: c.name } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { storeId: store.id, name: c.name, phone: c.phone, status: c.status, creditLimit: c.creditLimit },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { status: c.status, creditLimit: c.creditLimit },
      });
    }
    customerByKey[c.key] = customer;
  }

  // Reset transactional data so the seed can be re-run safely during development.
  await prisma.activityLog.deleteMany({ where: { storeId: store.id } });
  await prisma.debtPayment.deleteMany({ where: { storeId: store.id } });
  await prisma.sale.deleteMany({ where: { storeId: store.id } });
  await prisma.stockMovement.deleteMany({ where: { storeId: store.id } });
  await prisma.restockOrder.deleteMany({ where: { storeId: store.id } });
  await prisma.cashMovement.deleteMany({ where: { storeId: store.id } });
  await prisma.shift.deleteMany({ where: { storeId: store.id } });
  await prisma.customer.updateMany({ where: { storeId: store.id }, data: { currentDebt: 0 } });

  await prisma.customer.update({ where: { id: customerByKey.rina.id }, data: { currentDebt: 75000 } });
  await prisma.customer.update({ where: { id: customerByKey.joko.id }, data: { currentDebt: 15000 } });

  const stockMap = new Map<string, number>();
  for (const p of PRODUCT_DEFS) stockMap.set(productBySku[p.sku].id, 0);

  async function recordStockMovement(opts: {
    sku: string;
    type: (typeof StockMovementType)[keyof typeof StockMovementType];
    quantityChange: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    createdById?: string;
    createdAt: Date;
  }) {
    const productId = productBySku[opts.sku].id;
    const before = stockMap.get(productId) ?? 0;
    const after = roundMoney(before + opts.quantityChange);
    stockMap.set(productId, after);
    await prisma.stockMovement.create({
      data: {
        storeId: store.id,
        productId,
        type: opts.type,
        quantityChange: opts.quantityChange,
        stockBefore: before,
        stockAfter: after,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        reason: opts.reason,
        createdById: opts.createdById,
        createdAt: opts.createdAt,
      },
    });
    return after;
  }

  const openingDate = at(daysAgo(5), 7, 0);
  for (const p of PRODUCT_DEFS) {
    await recordStockMovement({
      sku: p.sku,
      type: StockMovementType.STOCK_OPNAME,
      quantityChange: p.initialStock,
      reason: "Stok awal (seed data)",
      createdById: inventoryStaff.id,
      createdAt: openingDate,
    });
  }

  async function createRestockOrder(opts: {
    date: Date;
    supplier: (typeof suppliers)[number];
    status: (typeof RestockStatus)[keyof typeof RestockStatus];
    items: { sku: string; quantityOrdered: number; quantityReceived: number }[];
    receivedDate?: Date;
  }) {
    const orderNumber = nextRestockNumber(opts.date);
    const order = await prisma.restockOrder.create({
      data: {
        storeId: store.id,
        supplierId: opts.supplier.id,
        orderNumber,
        status: opts.status,
        orderDate: opts.date,
        receivedDate: opts.receivedDate,
        createdById: inventoryStaff.id,
        totalCost: 0,
      },
    });

    let totalCost = 0;
    for (const item of opts.items) {
      const product = productBySku[item.sku];
      const unitCost = toNumber(product.costPrice);
      const subtotal = roundMoney(unitCost * item.quantityOrdered);
      totalCost += subtotal;
      await prisma.restockOrderItem.create({
        data: {
          restockOrderId: order.id,
          productId: product.id,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          unitCost,
          subtotal,
        },
      });
      if (item.quantityReceived > 0) {
        await recordStockMovement({
          sku: item.sku,
          type: StockMovementType.RESTOCK,
          quantityChange: item.quantityReceived,
          referenceType: "RESTOCK_ORDER",
          referenceId: order.id,
          createdById: inventoryStaff.id,
          createdAt: opts.receivedDate ?? opts.date,
        });
      }
    }
    await prisma.restockOrder.update({ where: { id: order.id }, data: { totalCost } });
    await prisma.activityLog.create({
      data: {
        storeId: store.id,
        userId: inventoryStaff.id,
        action: ActivityAction.RESTOCK,
        module: "restocks",
        description: `Restock ${orderNumber} (${opts.status}) dari ${opts.supplier.name}`,
        createdAt: opts.receivedDate ?? opts.date,
      },
    });
    return order;
  }

  const restockDate1 = at(daysAgo(4), 9, 0);
  await createRestockOrder({
    date: restockDate1,
    receivedDate: restockDate1,
    supplier: suppliers[0],
    status: RestockStatus.RECEIVED,
    items: [
      { sku: "SKU-001", quantityOrdered: 60, quantityReceived: 60 },
      { sku: "SKU-004", quantityOrdered: 80, quantityReceived: 80 },
      { sku: "SKU-006", quantityOrdered: 50, quantityReceived: 50 },
      { sku: "SKU-009", quantityOrdered: 20, quantityReceived: 20 },
    ],
  });

  const restockDate2 = at(daysAgo(3), 9, 0);
  await createRestockOrder({
    date: restockDate2,
    receivedDate: restockDate2,
    supplier: suppliers[1],
    status: RestockStatus.PARTIALLY_RECEIVED,
    items: [
      { sku: "SKU-002", quantityOrdered: 30, quantityReceived: 15 },
      { sku: "SKU-007", quantityOrdered: 30, quantityReceived: 15 },
    ],
  });

  const restockDate3 = at(TODAY, 8, 30);
  await createRestockOrder({
    date: restockDate3,
    supplier: suppliers[2],
    status: RestockStatus.ORDERED,
    items: [
      { sku: "SKU-010", quantityOrdered: 40, quantityReceived: 0 },
      { sku: "SKU-014", quantityOrdered: 40, quantityReceived: 0 },
    ],
  });

  const adjustDate = at(daysAgo(2), 7, 30);
  await recordStockMovement({
    sku: "SKU-013",
    type: StockMovementType.DAMAGED,
    quantityChange: -1,
    reason: "Kemasan rusak saat penataan rak",
    createdById: inventoryStaff.id,
    createdAt: adjustDate,
  });
  await prisma.activityLog.create({
    data: {
      storeId: store.id,
      userId: inventoryStaff.id,
      action: ActivityAction.ADJUST_STOCK,
      module: "stock",
      description: "Penyesuaian stok Susu UHT -1 (kemasan rusak)",
      createdAt: adjustDate,
    },
  });

  const shiftADate = daysAgo(2);
  const shiftBDate = daysAgo(1);
  const shiftCDate = TODAY;

  const shiftAOpen = at(shiftADate, 8, 0);
  const shiftBOpen = at(shiftBDate, 8, 0);
  const shiftCOpen = at(shiftCDate, 8, 0);

  const shiftA = await prisma.shift.create({
    data: { storeId: store.id, cashierId: cashier.id, status: ShiftStatus.OPEN, openedAt: shiftAOpen, openingCash: 200000, createdAt: shiftAOpen },
  });
  const shiftB = await prisma.shift.create({
    data: { storeId: store.id, cashierId: cashier.id, status: ShiftStatus.OPEN, openedAt: shiftBOpen, openingCash: 200000, createdAt: shiftBOpen },
  });
  const shiftC = await prisma.shift.create({
    data: { storeId: store.id, cashierId: cashier.id, status: ShiftStatus.OPEN, openedAt: shiftCOpen, openingCash: 200000, createdAt: shiftCOpen },
  });

  const shiftAccumulators: Record<string, { cashSalePayments: number; cashIn: number; cashOut: number; cashRefunds: number }> = {
    [shiftA.id]: { cashSalePayments: 0, cashIn: 0, cashOut: 0, cashRefunds: 0 },
    [shiftB.id]: { cashSalePayments: 0, cashIn: 0, cashOut: 0, cashRefunds: 0 },
    [shiftC.id]: { cashSalePayments: 0, cashIn: 0, cashOut: 0, cashRefunds: 0 },
  };

  async function openingCashMovement(shiftId: string, amount: number, occurredAt: Date) {
    await prisma.cashMovement.create({
      data: { storeId: store.id, shiftId, userId: cashier.id, type: CashMovementType.OPENING_CASH, amount, createdAt: occurredAt },
    });
  }
  await openingCashMovement(shiftA.id, 200000, shiftAOpen);
  await openingCashMovement(shiftB.id, 200000, shiftBOpen);
  await openingCashMovement(shiftC.id, 200000, shiftCOpen);
  await prisma.activityLog.createMany({
    data: [shiftA, shiftB, shiftC].map((s) => ({
      storeId: store.id,
      userId: cashier.id,
      action: ActivityAction.OPEN_SHIFT,
      module: "shifts",
      description: "Shift dibuka dengan modal awal Rp 200.000",
      createdAt: s.openedAt,
    })),
  });

  type SaleItemRecipe = { sku: string; quantity: number; discountAmount?: number };
  type PaymentRecipe = { method: (typeof PaymentMethod)[keyof typeof PaymentMethod]; amount: number };
  type SaleRecipe = {
    shiftId: string;
    at: Date;
    items: SaleItemRecipe[];
    transactionDiscount?: number;
    customerKey?: string;
    payments?: PaymentRecipe[];
    held?: boolean;
    partial?: { paidAmount: number };
  };

  async function createSaleFromRecipe(recipe: SaleRecipe) {
    const items = recipe.items.map((it) => ({
      product: productBySku[it.sku],
      quantity: it.quantity,
      discountAmount: it.discountAmount ?? 0,
    }));

    const totals = calculateSaleTotals({
      items: items.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
        unitPrice: it.product.sellingPrice,
        discountAmount: it.discountAmount,
      })),
      transactionDiscount: recipe.transactionDiscount ?? 0,
      taxEnabled: false,
      serviceChargeEnabled: false,
    });

    const status = recipe.held ? SaleStatus.HELD : SaleStatus.COMPLETED;
    const customer = recipe.customerKey ? customerByKey[recipe.customerKey] : null;

    let paidAmount = 0;
    let payments: PaymentRecipe[] = [];
    if (!recipe.held) {
      if (recipe.partial) {
        paidAmount = recipe.partial.paidAmount;
        payments = [{ method: PaymentMethod.CASH, amount: paidAmount }];
      } else if (recipe.payments) {
        payments = recipe.payments;
        paidAmount = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
      } else {
        paidAmount = totals.total;
        payments = [{ method: PaymentMethod.CASH, amount: paidAmount }];
      }
    }

    const changeAmount = recipe.held ? 0 : calculateChange(paidAmount, totals.total);
    const unpaidAmount = recipe.held ? 0 : calculateUnpaidAmount(paidAmount, totals.total);
    const paymentStatus = recipe.held ? PaymentStatus.UNPAID : calculatePaymentStatus(paidAmount, totals.total);

    const saleNumber = nextSaleNumber(recipe.at);

    const sale = await prisma.sale.create({
      data: {
        storeId: store.id,
        shiftId: recipe.shiftId,
        cashierId: cashier.id,
        customerId: customer?.id,
        saleNumber,
        status,
        paymentStatus,
        subtotal: totals.subtotal,
        itemDiscountTotal: totals.itemDiscountTotal,
        transactionDiscount: totals.transactionDiscount,
        taxAmount: totals.taxAmount,
        serviceAmount: totals.serviceAmount,
        total: totals.total,
        paidAmount,
        changeAmount,
        unpaidAmount,
        completedAt: recipe.held ? null : recipe.at,
        createdAt: recipe.at,
        updatedAt: recipe.at,
      },
    });

    for (const it of items) {
      const lineSubtotal = roundMoney(it.quantity * toNumber(it.product.sellingPrice) - it.discountAmount);
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: it.product.id,
          productNameSnapshot: it.product.name,
          skuSnapshot: it.product.sku,
          unitSnapshot: it.product.unit,
          quantity: it.quantity,
          unitPrice: it.product.sellingPrice,
          costPriceSnapshot: it.product.costPrice,
          discountAmount: it.discountAmount,
          subtotal: lineSubtotal,
          createdAt: recipe.at,
        },
      });

      if (!recipe.held) {
        await recordStockMovement({
          sku: it.product.sku,
          type: StockMovementType.SALE,
          quantityChange: -it.quantity,
          referenceType: "SALE",
          referenceId: sale.id,
          createdById: cashier.id,
          createdAt: recipe.at,
        });
      }
    }

    if (!recipe.held) {
      for (const p of payments) {
        await prisma.payment.create({
          data: { saleId: sale.id, storeId: store.id, shiftId: recipe.shiftId, method: p.method, amount: p.amount, createdAt: recipe.at },
        });
        if (p.method === PaymentMethod.CASH) {
          const isSoleCashPayment = payments.length === 1;
          const drawerAmount = isSoleCashPayment ? roundMoney(p.amount - changeAmount) : p.amount;
          shiftAccumulators[recipe.shiftId].cashSalePayments += drawerAmount;
          await prisma.cashMovement.create({
            data: { storeId: store.id, shiftId: recipe.shiftId, userId: cashier.id, type: CashMovementType.SALE_PAYMENT, amount: drawerAmount, createdAt: recipe.at },
          });
        }
      }

      await prisma.receipt.create({
        data: { saleId: sale.id, storeId: store.id, receiptNumber: nextReceiptNumber(recipe.at), printedAt: recipe.at, createdAt: recipe.at },
      });

      if (recipe.partial && customer) {
        await prisma.customer.update({ where: { id: customer.id }, data: { currentDebt: { increment: unpaidAmount } } });
      }
    }

    await prisma.activityLog.create({
      data: {
        storeId: store.id,
        userId: cashier.id,
        action: recipe.held ? ActivityAction.HOLD_SALE : ActivityAction.CREATE_SALE,
        module: "pos",
        description: recipe.held
          ? `Transaksi ${saleNumber} ditahan`
          : `Transaksi ${saleNumber} selesai - Rp ${totals.total.toLocaleString("id-ID")}`,
        metadataJson: { saleNumber, total: totals.total },
        createdAt: recipe.at,
      },
    });

    return sale;
  }

  // Shift A — 2 days ago
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 9, 10), items: [{ sku: "SKU-001", quantity: 2 }, { sku: "SKU-004", quantity: 3, discountAmount: 500 }] });
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 10, 5), items: [{ sku: "SKU-006", quantity: 5 }, { sku: "SKU-011", quantity: 1 }], payments: [{ method: PaymentMethod.CASH, amount: 50000 }] });
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 11, 20), items: [{ sku: "SKU-012", quantity: 3 }, { sku: "SKU-013", quantity: 1 }] });
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 12, 40), items: [{ sku: "SKU-017", quantity: 2 }, { sku: "SKU-018", quantity: 3 }], customerKey: "ani" });
  await createSaleFromRecipe({
    shiftId: shiftA.id,
    at: at(shiftADate, 14, 0),
    items: [{ sku: "SKU-014", quantity: 2 }, { sku: "SKU-015", quantity: 4 }, { sku: "SKU-016", quantity: 1 }],
    payments: [{ method: PaymentMethod.CASH, amount: 15000 }, { method: PaymentMethod.QRIS_MANUAL, amount: 9500 }],
  });
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 16, 15), items: [{ sku: "SKU-012", quantity: 2 }, { sku: "SKU-005", quantity: 4 }] });
  await createSaleFromRecipe({ shiftId: shiftA.id, at: at(shiftADate, 18, 30), items: [{ sku: "SKU-003", quantity: 3 }, { sku: "SKU-020", quantity: 2 }], customerKey: "dedi" });

  await prisma.cashMovement.create({
    data: { storeId: store.id, shiftId: shiftA.id, userId: cashier.id, type: CashMovementType.CASH_OUT, amount: 15000, notes: "Beli galon air minum", createdAt: at(shiftADate, 13, 0) },
  });
  shiftAccumulators[shiftA.id].cashOut += 15000;

  const jokoPaymentDate = at(shiftADate, 15, 0);
  await prisma.debtPayment.create({
    data: { storeId: store.id, customerId: customerByKey.joko.id, receivedById: cashier.id, shiftId: shiftA.id, amount: 15000, method: PaymentMethod.CASH, paidAt: jokoPaymentDate, createdAt: jokoPaymentDate },
  });
  await prisma.customer.update({ where: { id: customerByKey.joko.id }, data: { currentDebt: { decrement: 15000 } } });
  shiftAccumulators[shiftA.id].cashIn += 15000;
  await prisma.activityLog.create({
    data: { storeId: store.id, userId: cashier.id, action: ActivityAction.RECEIVE_PAYMENT, module: "customers", description: "Pembayaran utang dari Joko Prasetyo Rp 15.000", createdAt: jokoPaymentDate },
  });

  {
    const acc = shiftAccumulators[shiftA.id];
    const expectedCash = calculateExpectedCash({ openingCash: 200000, cashSalePayments: acc.cashSalePayments, cashIn: acc.cashIn, cashOut: acc.cashOut, cashRefunds: acc.cashRefunds });
    const actualCash = roundMoney(expectedCash - 3500);
    const closedAt = at(shiftADate, 20, 0);
    await prisma.shift.update({
      where: { id: shiftA.id },
      data: { status: ShiftStatus.CLOSED, closedAt, expectedCash, actualCash, cashDifference: roundMoney(actualCash - expectedCash) },
    });
    await prisma.activityLog.create({
      data: { storeId: store.id, userId: cashier.id, action: ActivityAction.CLOSE_SHIFT, module: "shifts", description: `Shift ditutup, selisih kas Rp ${(actualCash - expectedCash).toLocaleString("id-ID")}`, createdAt: closedAt },
    });
  }

  // Shift B — yesterday
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 9, 0), items: [{ sku: "SKU-002", quantity: 2 }, { sku: "SKU-019", quantity: 1 }] });
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 10, 10), items: [{ sku: "SKU-012", quantity: 1 }, { sku: "SKU-008", quantity: 2 }], payments: [{ method: PaymentMethod.CASH, amount: 150000 }] });
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 11, 45), items: [{ sku: "SKU-004", quantity: 4 }, { sku: "SKU-009", quantity: 1 }], customerKey: "sari" });
  await createSaleFromRecipe({
    shiftId: shiftB.id,
    at: at(shiftBDate, 13, 15),
    items: [{ sku: "SKU-010", quantity: 2 }, { sku: "SKU-011", quantity: 1 }],
    payments: [{ method: PaymentMethod.CASH, amount: 34000 }, { method: PaymentMethod.BANK_TRANSFER, amount: 30000 }],
  });
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 14, 30), items: [{ sku: "SKU-007", quantity: 6 }], transactionDiscount: 1000 });
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 16, 0), items: [{ sku: "SKU-005", quantity: 6 }, { sku: "SKU-003", quantity: 2 }] });
  await createSaleFromRecipe({ shiftId: shiftB.id, at: at(shiftBDate, 18, 45), items: [{ sku: "SKU-014", quantity: 1 }, { sku: "SKU-015", quantity: 3 }, { sku: "SKU-017", quantity: 1 }], customerKey: "joko" });

  await prisma.cashMovement.create({
    data: { storeId: store.id, shiftId: shiftB.id, userId: cashier.id, type: CashMovementType.CASH_IN, amount: 50000, notes: "Tambahan modal dari pemilik", createdAt: at(shiftBDate, 8, 30) },
  });
  shiftAccumulators[shiftB.id].cashIn += 50000;
  await prisma.cashMovement.create({
    data: { storeId: store.id, shiftId: shiftB.id, userId: cashier.id, type: CashMovementType.CASH_OUT, amount: 25000, notes: "Beli alat kebersihan toko", createdAt: at(shiftBDate, 17, 0) },
  });
  shiftAccumulators[shiftB.id].cashOut += 25000;

  const rinaPayment1Date = at(shiftBDate, 12, 0);
  await prisma.debtPayment.create({
    data: { storeId: store.id, customerId: customerByKey.rina.id, receivedById: cashier.id, shiftId: shiftB.id, amount: 30000, method: PaymentMethod.CASH, paidAt: rinaPayment1Date, createdAt: rinaPayment1Date },
  });
  await prisma.customer.update({ where: { id: customerByKey.rina.id }, data: { currentDebt: { decrement: 30000 } } });
  shiftAccumulators[shiftB.id].cashIn += 30000;
  await prisma.activityLog.create({
    data: { storeId: store.id, userId: cashier.id, action: ActivityAction.RECEIVE_PAYMENT, module: "customers", description: "Pembayaran utang dari Rina Kusuma Rp 30.000", createdAt: rinaPayment1Date },
  });

  {
    const acc = shiftAccumulators[shiftB.id];
    const expectedCash = calculateExpectedCash({ openingCash: 200000, cashSalePayments: acc.cashSalePayments, cashIn: acc.cashIn, cashOut: acc.cashOut, cashRefunds: acc.cashRefunds });
    const actualCash = roundMoney(expectedCash + 2000);
    const closedAt = at(shiftBDate, 20, 0);
    await prisma.shift.update({
      where: { id: shiftB.id },
      data: { status: ShiftStatus.CLOSED, closedAt, expectedCash, actualCash, cashDifference: roundMoney(actualCash - expectedCash) },
    });
    await prisma.activityLog.create({
      data: { storeId: store.id, userId: cashier.id, action: ActivityAction.CLOSE_SHIFT, module: "shifts", description: `Shift ditutup, selisih kas Rp ${(actualCash - expectedCash).toLocaleString("id-ID")}`, createdAt: closedAt },
    });
  }

  // Shift C — today (stays open)
  await createSaleFromRecipe({ shiftId: shiftC.id, at: at(shiftCDate, 8, 30), items: [{ sku: "SKU-001", quantity: 3 }, { sku: "SKU-020", quantity: 2 }] });
  await createSaleFromRecipe({ shiftId: shiftC.id, at: at(shiftCDate, 9, 15), items: [{ sku: "SKU-008", quantity: 3 }, { sku: "SKU-010", quantity: 1 }], payments: [{ method: PaymentMethod.CASH, amount: 225000 }] });
  await createSaleFromRecipe({ shiftId: shiftC.id, at: at(shiftCDate, 10, 0), items: [{ sku: "SKU-004", quantity: 2 }, { sku: "SKU-003", quantity: 1 }], customerKey: "ani" });
  await createSaleFromRecipe({
    shiftId: shiftC.id,
    at: at(shiftCDate, 10, 45),
    items: [{ sku: "SKU-018", quantity: 2 }, { sku: "SKU-017", quantity: 3 }],
    payments: [{ method: PaymentMethod.CASH, amount: 8000 }, { method: PaymentMethod.E_WALLET_MANUAL, amount: 7500 }],
  });
  await createSaleFromRecipe({ shiftId: shiftC.id, at: at(shiftCDate, 11, 30), items: [{ sku: "SKU-013", quantity: 2 }, { sku: "SKU-014", quantity: 1 }] });
  await createSaleFromRecipe({
    shiftId: shiftC.id,
    at: at(shiftCDate, 12, 15),
    items: [{ sku: "SKU-008", quantity: 1 }, { sku: "SKU-010", quantity: 1 }, { sku: "SKU-009", quantity: 1 }],
    customerKey: "budi",
    partial: { paidAmount: 70000 },
  });

  await createSaleFromRecipe({ shiftId: shiftC.id, at: at(shiftCDate, 13, 0), items: [{ sku: "SKU-004", quantity: 2 }, { sku: "SKU-015", quantity: 1 }], held: true });

  const rinaPayment2Date = at(shiftCDate, 11, 0);
  await prisma.debtPayment.create({
    data: { storeId: store.id, customerId: customerByKey.rina.id, receivedById: cashier.id, shiftId: shiftC.id, amount: 20000, method: PaymentMethod.CASH, paidAt: rinaPayment2Date, createdAt: rinaPayment2Date },
  });
  await prisma.customer.update({ where: { id: customerByKey.rina.id }, data: { currentDebt: { decrement: 20000 } } });
  shiftAccumulators[shiftC.id].cashIn += 20000;
  await prisma.activityLog.create({
    data: { storeId: store.id, userId: cashier.id, action: ActivityAction.RECEIVE_PAYMENT, module: "customers", description: "Pembayaran utang dari Rina Kusuma Rp 20.000", createdAt: rinaPayment2Date },
  });

  await prisma.activityLog.createMany({
    data: [owner, manager, cashier, inventoryStaff].map((u, idx) => ({
      storeId: store.id,
      userId: u.id,
      action: ActivityAction.LOGIN,
      module: "auth",
      description: `${u.name} masuk ke KasirOne Pro`,
      createdAt: at(shiftCDate, 7, 45 + idx),
    })),
  });

  // Sync each product's stock with the simulated stock ledger so the
  // Product.stock column matches the sum of its StockMovement history.
  for (const p of PRODUCT_DEFS) {
    const productId = productBySku[p.sku].id;
    const finalStock = stockMap.get(productId) ?? 0;
    await prisma.product.update({ where: { id: productId }, data: { stock: finalStock } });
  }

  console.log("Seed selesai.");
  console.log(`Store: ${store.name} (${store.slug})`);
  console.log("Akun demo (password sama untuk semua): Password123!");
  for (const u of USER_DEFS) console.log(` - ${u.email} (${u.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
