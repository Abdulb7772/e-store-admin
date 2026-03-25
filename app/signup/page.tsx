'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';

type SignupValues = {
  firstName: string;
  lastName: string;
  emailPhone: string;
  createPassword: string;
  confirmPassword: string;
};

type SignupErrors = Partial<Record<keyof SignupValues, string>>;

const initialValues: SignupValues = {
  firstName: '',
  lastName: '',
  emailPhone: '',
  createPassword: '',
  confirmPassword: '',
};

function validate(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s+()-]{10,}$/;

  if (values.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (values.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }

  if (!values.emailPhone.trim()) {
    errors.emailPhone = 'Email or phone number is required';
  } else if (!emailRegex.test(values.emailPhone) && !phoneRegex.test(values.emailPhone)) {
    errors.emailPhone = 'Must be a valid email or phone number';
  }

  if (values.createPassword.length < 6) {
    errors.createPassword = 'Password must be at least 6 characters';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.confirmPassword !== values.createPassword) {
    errors.confirmPassword = 'Passwords must match';
  }

  return errors;
}

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState<SignupValues>(initialValues);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: keyof SignupValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submitSignup = async () => {
    if (isSubmitting) return;

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the highlighted fields.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPhone: values.emailPhone.trim(),
          password: values.createPassword,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const userData = {
          email: data.data.emailPhone || values.emailPhone,
          username: data.data.username,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
        };

        login(userData, data.data.token);
        toast.success('Account created successfully.');

        window.setTimeout(() => {
          router.push('/dashboard');
        }, 700);
      } else {
        const message = data.message || 'Sign up failed';
        setErrors((prev) => ({ ...prev, emailPhone: message }));
        toast.error(message);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setErrors((prev) => ({ ...prev, emailPhone: 'Network error. Please try again.' }));
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative px-4 py-12"
      style={{
        backgroundImage: 'url(/images/login-signup.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void submitSignup();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative z-10 w-full max-w-md">
        <p className="text-xs font-bold uppercase text-center tracking-[0.35em] text-white/75">
          Admin Portal
        </p>
        <h2 className="text-3xl font-bold text-center mb-8 italic text-white">
          Create Your New Account
        </h2>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              name="firstName"
              value={values.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              placeholder="First Name"
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-full border-2 border-white/50 bg-white/10 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
            />
            {errors.firstName && (
              <div className="text-red-300 text-sm mt-1 ml-4">{errors.firstName}</div>
            )}
          </div>

          <div>
            <input
              type="text"
              name="lastName"
              value={values.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              placeholder="Last Name"
              autoComplete="family-name"
              className="w-full px-4 py-3 rounded-full border-2 border-white/50 bg-white/10 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
            />
            {errors.lastName && (
              <div className="text-red-300 text-sm mt-1 ml-4">{errors.lastName}</div>
            )}
          </div>

          <div>
            <input
              type="text"
              name="emailPhone"
              value={values.emailPhone}
              onChange={(event) => updateField('emailPhone', event.target.value)}
              placeholder="Email & Phone Number"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-full border-2 border-white/50 bg-white/10 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
            />
            {errors.emailPhone && (
              <div className="text-red-300 text-sm mt-1 ml-4">{errors.emailPhone}</div>
            )}
          </div>

          <div>
            <input
              type="password"
              name="createPassword"
              value={values.createPassword}
              onChange={(event) => updateField('createPassword', event.target.value)}
              placeholder="Create Password"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-full border-2 border-white/50 bg-white/10 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
            />
            {errors.createPassword && (
              <div className="text-red-300 text-sm mt-1 ml-4">{errors.createPassword}</div>
            )}
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              placeholder="Confirm Password"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-full border-2 border-white/50 bg-white/10 backdrop-blur-sm placeholder-white/70 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
            />
            {errors.confirmPassword && (
              <div className="text-red-300 text-sm mt-1 ml-4">{errors.confirmPassword}</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              void submitSignup();
            }}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 mt-6 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-white">
          Do you have an account?{' '}
          <Link
            href="/login"
            className="text-blue-300 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
