export const formatCurrency = (amount: number): string => {
  // Format angka dengan titik sebagai pemisah ribuan (format Indonesia)
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + formatted;
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export const formatDateShort = (dateString: string): string => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
};

export const formatPhone = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 62
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }
  
  // If doesn't start with 62, add it
  if (!cleaned.startsWith('62')) {
    return '62' + cleaned;
  }
  
  return cleaned;
};
