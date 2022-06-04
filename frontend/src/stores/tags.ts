import { proxy } from 'valtio';
import TagService from '../services/tag';

export const tagsState = proxy<Tag[]>([]);

export const createTag = async (name: string) => {
  const res = await TagService.create({ name });
  if (res.success) {
    tagsState.push(res.tag);
  }
  return res.tag;
};

(async () => {
  const res = await TagService.list();
  tagsState.push(...res.tags);
})();
