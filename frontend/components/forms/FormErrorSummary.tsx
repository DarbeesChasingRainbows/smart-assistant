interface Props {
  errors: string[];
}

export default function FormErrorSummary({ errors }: Props) {
  if (!errors || errors.length === 0) return null;

  return (
    <div class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
      {errors.join(" ")}
    </div>
  );
}
