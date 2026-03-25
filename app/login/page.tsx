'use client';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const handleLogin = async (
    values: { email: string; password: string },
    { setSubmitting, setErrors }: any
  ) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.email, // Backend uses 'username' field but accepts email
          password: values.password,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        console.log('Sign in successful:', data);
        const userData = {
          email: data.data.emailPhone || values.email,
          username: data.data.username,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
        };
        login(userData, data.data.token);
        toast.success('Signed in successfully.');
        router.push('/dashboard');
      } else {
        toast.error(data.message || 'Invalid credentials');
        setErrors({ email: data.message || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error('Network error. Please try again.');
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative h-screen overflow-hidden flex items-center justify-center px-4 sm:px-6"
      style={{
        backgroundImage: 'url(/images/login-signup.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 w-full max-w-md md:top-40 md:right-40 top-20 right-0">
        <div className="bg-gradient-to-b  to-pink-200 backdrop-blur-xs rounded-3xl p-3 md:p-6">
        <p className="text-xs font-bold uppercase text-center tracking-[0.35em] text-black/75">
              Admin Portal
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-center m-1 italic text-black">
          Sign In To Your Account
        </h2>
        

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleLogin}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-3 sm:space-y-4">
                  <div>
                    <span className="text-sm font-bold md:text-base">Email:</span>
                    <Field
                      type="email"
                      name="email"
                      placeholder="Email"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-full border-2 border-white/50 bg-white/80 backdrop-blur-sm placeholder-black/20 text-black focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
                    />
                    <ErrorMessage
                      name="email"
                      component="div"
                      className="text-red-300 text-sm mt-1 ml-4"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-bold md:text-base">Password:</span>
                    <Field
                      type="password"
                      name="password"
                      placeholder="Password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-full border-2 border-white/50 bg-white/80 backdrop-blur-sm placeholder-black/20 text-black focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white"
                    />
                    <ErrorMessage
                      name="password"
                      component="div"
                      className="text-red-300 text-sm mt-1 ml-4"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black hover:bg-slate-800 text-slate-400 font-bold py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-base rounded-full transition duration-300 mt-4 sm:mt-6 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </Form>
              )}
            </Formik>

            {/* Sign Up Prompt */}
            <p className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-black">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-black font-semibold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
    </div>
  );
}
