export const toFriendlyDate = (date) => {
  if (!date) return '';
  return date.toLocaleString();
};

export const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};
