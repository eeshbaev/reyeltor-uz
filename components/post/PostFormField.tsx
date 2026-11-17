import type { TextInputProps } from 'react-native';
import { TextField } from '@/components/ui/TextField';

interface PostFormFieldProps extends TextInputProps {
  label?: string;
  optional?: boolean;
  half?: boolean;
}

export function PostFormField(props: PostFormFieldProps) {
  return <TextField {...props} />;
}
