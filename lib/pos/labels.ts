export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer Bank",
  QRIS_MANUAL: "QRIS",
  DEBIT: "Kartu Debit",
  CREDIT: "Kartu Kredit",
  E_WALLET_MANUAL: "E-Wallet",
  STORE_CREDIT: "Saldo Toko",
  OTHER: "Lainnya",
};

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CREATE: "Membuat data",
  UPDATE: "Memperbarui data",
  DELETE: "Menghapus data",
  LOGIN: "Masuk",
  OPEN_SHIFT: "Membuka shift",
  CLOSE_SHIFT: "Menutup shift",
  CREATE_SALE: "Transaksi selesai",
  HOLD_SALE: "Menahan transaksi",
  VOID_SALE: "Membatalkan transaksi",
  REFUND_SALE: "Refund transaksi",
  RESTOCK: "Restock barang",
  ADJUST_STOCK: "Penyesuaian stok",
  RECEIVE_PAYMENT: "Menerima pembayaran",
  EXPORT: "Ekspor data",
};

export const SALE_STATUS_LABELS: Record<string, string> = {
  HELD: "Ditahan",
  COMPLETED: "Selesai",
  VOIDED: "Dibatalkan",
  PARTIALLY_REFUNDED: "Refund Sebagian",
  REFUNDED: "Refund",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Lunas",
  PARTIALLY_PAID: "Sebagian",
  UNPAID: "Belum Bayar",
  REFUNDED: "Refund",
};

export const RESTOCK_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  ORDERED: "Dipesan",
  PARTIALLY_RECEIVED: "Diterima Sebagian",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
};

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  BLOCKED: "Diblokir",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Tidak Aktif",
  ARCHIVED: "Diarsipkan",
};
