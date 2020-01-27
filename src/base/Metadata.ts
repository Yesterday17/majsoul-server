export interface Metadata {
  id: string;
  version: string;
  name: string;
  author: string | string[];
  description: string;
  preview: string;
  dependencies: { [key: string]: string };
}
