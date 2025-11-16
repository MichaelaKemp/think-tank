export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return /\S+@\S+\.\S+/.test(email.trim());
};

export const validatePassword = (password: string): boolean => {
  if (!password) return false;
  return password.length >= 6;
};


export const formatFirebaseError = (err: any): string => {
  const msg = err?.message || "";

  if (msg.includes("auth/email-already-in-use"))
    return "That email is already registered.";

  if (msg.includes("auth/invalid-email"))
    return "The email address is invalid.";

  if (msg.includes("auth/user-not-found"))
    return "No account found with that email.";

  if (msg.includes("auth/wrong-password"))
    return "Incorrect password.";

  if (msg.includes("auth/weak-password"))
    return "Your password is too weak.";

  return "Something went wrong. Please try again.";
};


export const normalizeEmail = (email: string) => email.trim().toLowerCase();