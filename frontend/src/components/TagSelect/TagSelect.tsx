import { useEffect, useMemo, useRef, useState } from "react";
import { createTag, tagsState } from "@/src/stores/tags"
import { Button, TextField } from "@mui/material"
import produce from "immer";
import { useSnapshot } from "valtio"
import { useTranslation } from "react-i18next";
import { Tag } from "../Tag"
import './TagSelect.less'



export interface TagSelectProps {
  value?: Tag[];
  onChange?: (tags: Tag[]) => void;
  allowAdd?: boolean;
}
export const TagSelect = (
  { value, onChange, allowAdd }: TagSelectProps,
) => {
  const { t } = useTranslation();
  const tags = useSnapshot(tagsState)
  const [selectedTagsMap, setSelectedTagsMap] = useState<{
    [key: number]: boolean
  }>({})
  const [addTagFormOpen, setAddTagFormOpen] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')

  const selectedTagsRef = useRef<Tag[]>([])

  useEffect(() => {
    if (value !== undefined) {
      setSelectedTagsMap(value.reduce((acc, tag) => {
        acc[tag.id] = true
        return acc
      }, {} as { [key: number]: boolean }))
      selectedTagsRef.current = value
    }
  }, [value])

  const addTagFormOpenTagAdd = () => {
    setAddTagFormOpen(true)
  }

  const addButtonText = useMemo(() => {
    return tags.findIndex(t => t.name === newTagValue) === -1 ? t("TagSelect.add") : t("TagSelect.select")
  }, [tags, newTagValue])

  const addTag = async () => {
    if (newTagValue) {
      const index = tags.findIndex(t => t.name === newTagValue)
      if (index === -1) {
        const newTag = await createTag(newTagValue)
        setSelectedTagsMap(produce(draft => {
          draft[newTag.id] = true
        }))
        selectedTagsRef.current = [...selectedTagsRef.current, newTag]
        onChange && onChange(selectedTagsRef.current)
      }
      setNewTagValue('')
      setAddTagFormOpen(false)
    }
  }

  const cancelAddTag = () => {
    setAddTagFormOpen(false)
    setNewTagValue('')
  }

  const toggleSelect = (id: number) => {
    if (selectedTagsMap[id]) {
      setSelectedTagsMap(produce(draft => {
        delete draft[id]
      }))
      selectedTagsRef.current = selectedTagsRef.current.filter(t => t.id !== id)
    } else {
      setSelectedTagsMap(produce(draft => {
        draft[id] = true
      }))
      selectedTagsRef.current.push(tags.find(t => t.id === id) as Tag)
    }
    onChange && onChange(selectedTagsRef.current)
  }

  return (
    <div className="TagSelect">
      <div className="TagSelect__list">
        {tags.map(tag => (
          <div
            className="TagSelect__list__item"
            key={tag.id}
            onClick={() => toggleSelect(tag.id)}
          >
            <Tag
              content={tag.name}
              bgColor={selectedTagsMap[tag.id] ? '#AEEE93' : undefined}
              color={selectedTagsMap[tag.id] ? '#000' : undefined}
              borderColor={selectedTagsMap[tag.id] ? '#AEEE93' : undefined}
            />
          </div>
        ))}
        {!addTagFormOpen && allowAdd ? (<Button
          onClick={addTagFormOpenTagAdd}
        >
          {t("TagSelect.createNewTag")}
        </Button>) : null}
      </div>

      {addTagFormOpen ? (
        <div className="TagSelect__form">
          <TextField
            className="TagSelect__form__input"
            autoFocus
            placeholder={t("TagSelect.pleaseInputTagName")}
            variant="standard"
            value={newTagValue}
            onChange={e => setNewTagValue(e.target.value.trim())}
          />
          <Button
            className="TagSelect__form__btn"
            onClick={cancelAddTag}
          >
            {t("TagSelect.cancel")}
          </Button>
          <Button
            className="TagSelect__form__btn"
            variant="contained"
            onClick={addTag}
          >
            {addButtonText}
          </Button>
        </div>
      ) : null}
    </div>
  )
}