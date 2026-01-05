import { PageProps, page } from "fresh";
import { define } from "../utils.ts";

interface TestData {
  message: string;
}

export const handler = define.handlers<TestData>({
  GET() {
    return page<TestData>({ message: "Hello Fresh v2" });
  },
});

export default define.page(function TestPage(ctx: PageProps<TestData>) {
  const { message } = ctx.data;

  return (
    <div>
      <h1>Test Page</h1>
      <p>{message}</p>
    </div>
  );
});
