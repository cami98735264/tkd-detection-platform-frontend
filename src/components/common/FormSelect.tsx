import { useField } from "formik";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FormSelectOption {
  value: string;
  label: string;
}

interface CommonProps {
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

interface ControlledProps extends CommonProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  disabled,
  id,
  className,
}: ControlledProps) {
  return (
    <Select
      value={value === "" ? undefined : value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FormikProps extends CommonProps {
  name: string;
  onChangeExtra?: (value: string) => void;
}

export function FormikSelect({
  name,
  options,
  placeholder,
  disabled,
  id,
  className,
  onChangeExtra,
}: FormikProps) {
  const [field, , helpers] = useField(name);
  const current = field.value == null || field.value === "" ? "" : String(field.value);

  return (
    <FormSelect
      id={id}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      options={options}
      value={current}
      onValueChange={(v) => {
        helpers.setValue(v);
        helpers.setTouched(true, false);
        onChangeExtra?.(v);
      }}
    />
  );
}
