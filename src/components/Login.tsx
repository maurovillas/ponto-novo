import { signInWithGoogle } from '../supabase';

export const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Login</h1>
        <button
          onClick={signInWithGoogle}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
