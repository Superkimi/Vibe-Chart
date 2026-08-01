export function withBasePath(
  path: `/${string}`,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
) {
  return `${basePath}${path}`;
}
