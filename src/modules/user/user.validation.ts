import { z } from 'zod';
import { Role, Roles } from '../../middlewares/roles';

const createUserValidationSchema = z.object({
  body: z.object({
    fname: z
      .string({
        required_error: 'First  name is required.',
        invalid_type_error: 'First name must be a string.',
      })
      .min(1, 'First name cannot be empty.'),
    lname: z
      .string({
        required_error: 'Last name is required.',
        invalid_type_error: 'Last name must be a string.',
      })
      .min(1, 'Last name cannot be empty.'),
    email: z
      .string({
        required_error: 'Email is required.',
        invalid_type_error: 'Email must be a string.',
      })
      .email('Invalid email address.'),
    password: z
      .string({
        required_error: 'Password is required.',
        invalid_type_error: 'Password must be a string.',
      })
      .min(8, 'Password must be at least 8 characters long.'),
    role: z
      .string({
        required_error: 'Role is required.',
        invalid_type_error: 'Role must be a string.',
      })
      .refine(role => Roles.includes(role as Role), {
        message: `Role must be selected`, //projectManager  ,  projectSupervisor
      }),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    fullName: z
      .string({
        invalid_type_error: 'Full name must be a string.',
      })
      .min(1, 'Full name cannot be empty.')
      .optional(),
    email: z
      .string({
        invalid_type_error: 'Email must be a string.',
      })
      .email('Invalid email address.')
      .optional(),
    password: z
      .string({
        invalid_type_error: 'Password must be a string.',
      })
      .min(8, 'Password must be at least 8 characters long.')
      .optional(),
    branch: z
      .string({
        invalid_type_error: 'Branch must be a string.',
      })
      .optional(),
    currentStatus: z
      .enum(['active-duty', 'reserve', 'retried'], {
        invalid_type_error: 'Current status must be a valid option.',
      })
      .optional(),
    description: z
      .string({
        invalid_type_error: 'Description must be a string.',
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: 'Role must be a string.',
      })
      .refine(role => Roles.includes(role as Role), {
        message: `Role must be one of the following: ${Roles.join(', ')}`,
      })
      .optional(),
    isDeleted: z
      .boolean({
        invalid_type_error: 'isDeleted must be a boolean.',
      })
      .optional(),
    isBlocked: z
      .boolean({
        invalid_type_error: 'isBlocked must be a boolean.',
      })
      .optional(),
    isEmailVerified: z
      .boolean({
        invalid_type_error: 'isEmailVerified must be a boolean.',
      })
      .optional(),
    isResetPassword: z
      .boolean({
        invalid_type_error: 'isResetPassword must be a boolean.',
      })
      .optional(),
  }),
});

const changeUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['Active', 'Inactive'], {
      required_error: 'Status is required.',
      invalid_type_error: 'Status must be a valid option.',
    }),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  changeUserStatusValidationSchema,
};
