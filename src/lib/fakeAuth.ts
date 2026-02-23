export const mockUser = {
  email: "admin@warriors.com",
  password: "123456",
};

export function login(email: string, password: string) {
  if (email === mockUser.email && password === mockUser.password) {
    localStorage.setItem("isLogged", "true");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem("isLogged");
}

export function isAuthenticated() {
  return localStorage.getItem("isLogged") === "true";
}