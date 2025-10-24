// src/app/login/__test__/SignupForm.test.tsx

// 1) mock next/navigation ก่อน import component
jest.mock("next/navigation", () => {
    const params = new URLSearchParams(); // ไม่มี query (token, error)
  
    return {
      useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
      }),
      useSearchParams: () => {
        return {
          get: (key: string) => params.get(key),
          entries: () => params.entries(),
          toString: () => params.toString(),
          has: (key: string) => params.has(key),
        };
      },
    };
  });
  
  // 2) เราจะ mock redirectTo ของโมดูลหน้า login ให้กลายเป็น jest.fn()
  //    ต้องประกาศ mock *ก่อน* import component
  jest.mock("../page", () => {
    // ดึงของจริงของโมดูลมา (เราจะไม่ mock ทุกอย่าง แค่อยากแทน redirectTo)
    const actual = jest.requireActual("../page");
  
    return {
      __esModule: true,
      ...actual,
      redirectTo: jest.fn(), // override redirectTo ด้วย mock fn
    };
  });
  
  import React from "react";
  import { render, screen, fireEvent } from "@testing-library/react";
  import LoginPage, { buildGoogleAuthUrl, redirectTo } from "../page";
  
  // ---------- mock env ----------
  const ORIGINAL_ENV = process.env;
  
  beforeEach(() => {
    jest.resetModules();
  
    process.env = { ...ORIGINAL_ENV };
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "fake-client-id-123";
  });
  
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });
  
  describe("LoginPage intro mode", () => {
    test("renders Sign up with Google and Sign up with Email buttons", () => {
      render(<LoginPage />);
  
      // ปุ่ม google
      const googleBtn = screen.getByTestId("signup-google");
      expect(googleBtn).toBeInTheDocument();
      expect(screen.getByText(/Sign up with Google/i)).toBeInTheDocument();
  
      // ปุ่ม email
      const emailBtn = screen.getByTestId("signup-email");
      expect(emailBtn).toBeInTheDocument();
      expect(screen.getByText(/Sign up with Email/i)).toBeInTheDocument();
    });
  
  
    test("clicking Sign up with Email switches to signup mode (shows signup form)", () => {
      render(<LoginPage />);
  
      // ยังไม่เห็น signup form
      expect(screen.queryByTestId("signup-form")).toBeNull();
  
      const emailBtn = screen.getByTestId("signup-email");
      fireEvent.click(emailBtn);
  
      // ตอนนี้ควรเห็น signup form แล้ว
      const signupForm = screen.getByTestId("signup-form");
      expect(signupForm).toBeInTheDocument();
  
      expect(
        screen.getByText(/Create your account/i)
      ).toBeInTheDocument();
    });
  });
  
  describe("buildGoogleAuthUrl helper", () => {
    test("generates correct Google OAuth URL", () => {
      const url = buildGoogleAuthUrl("abc123");
  
      expect(url).toMatch(
        /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/
      );
      expect(url).toContain("client_id=abc123");
      expect(url).toContain(
        encodeURIComponent("http://localhost:8000/api/auth/google/callback")
      );
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=");
      expect(url).toContain(encodeURIComponent("email profile"));
      expect(url).toContain("prompt=consent");
    });
  });
  