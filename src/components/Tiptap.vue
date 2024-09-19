<template>
  <div v-if="editor" class="container">
    <div class="control-group">
      <div class="button-group">
        <button @click="editor.chain().focus().toggleBold().run()" :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
          <i class="fas fa-bold"></i>
        </button>
        <button @click="editor.chain().focus().toggleItalic().run()" :disabled="!editor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }">
          <i class="fas fa-italic"></i>
        </button>
        <button @click="editor.chain().focus().toggleStrike().run()" :disabled="!editor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }">
          <i class="fas fa-strikethrough"></i>
        </button>
        <button @click="editor.chain().focus().toggleCode().run()" :disabled="!editor.can().chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }">
          <i class="fas fa-code"></i>
        </button>
        <button @click="editor.chain().focus().unsetAllMarks().run()">
          <i class="fas fa-remove-format"></i>
        </button>
        <button @click="editor.chain().focus().clearNodes().run()">
          <i class="fas fa-trash-alt"></i>
        </button>
        <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }">
          <i class="fas fa-paragraph"></i>
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }">
          <i class="fas fa-heading"></i><sub>1</sub>
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }">
          <i class="fas fa-heading"></i><sub>2</sub>
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }">
          <i class="fas fa-heading"></i><sub>3</sub>
        </button>
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">
          <i class="fas fa-list-ul"></i>
        </button>
        <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }">
          <i class="fas fa-list-ol"></i>
        </button>
        <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }">
          <i class="fas fa-file-code"></i>
        </button>
        <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }">
          <i class="fas fa-quote-right"></i>
        </button>
        <button @click="editor.chain().focus().setHorizontalRule().run()">
          <i class="fas fa-minus"></i>
        </button>
        <button @click="editor.chain().focus().setHardBreak().run()">
          <i class="fas fa-level-down-alt"></i>
        </button>
        <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().chain().focus().undo().run()">
          <i class="fas fa-undo"></i>
        </button>
        <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().chain().focus().redo().run()">
          <i class="fas fa-redo"></i>
        </button>
        <button @click="editor.chain().focus().setColor('#958DF1').run()" :class="{ 'is-active': editor.isActive('textStyle', { color: '#958DF1' }) }">
          <i class="fas fa-palette" style="color: #958DF1;"></i>
        </button>
      </div>
    </div>
    <editor-content :editor="editor" />
  </div>
</template>

<script>
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

export default {
  components: {
    EditorContent,
  },

  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },

  emits: ['update:modelValue'],

  setup(props, { emit }) {
    const editor = ref(null)

    onMounted(() => {
      editor.value = new Editor({
        extensions: [
          StarterKit,
          Markdown,
        ],
        content: props.modelValue,
        onUpdate: ({ editor }) => {
          emit('update:modelValue', editor.storage.markdown.getMarkdown())
        },
        editorProps: {
          attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          },
        },
      })
    })

    watch(() => props.modelValue, (newValue) => {
      if (editor.value && newValue !== editor.value.storage.markdown.getMarkdown()) {
        editor.value.commands.setContent(newValue, false)
      }
    })

    onBeforeUnmount(() => {
      if (editor.value) {
        editor.value.destroy()
      }
    })

    return { editor }
  },
}
</script>

<style lang="scss">
.tiptap {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 1rem;

  &:focus-within {
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  }

  /* List styles */
  ul,
  ol {
    padding: 0 1rem;
    margin: 1.25rem 1rem 1.25rem 0.4rem;

    li p {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
  }

  /* Heading styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
    margin-top: 2.5rem;
    text-wrap: pretty;
  }

  h1,
  h2 {
    margin-top: 3.5rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.4rem;
  }

  h2 {
    font-size: 1.2rem;
  }

  h3 {
    font-size: 1.1rem;
  }

  h4,
  h5,
  h6 {
    font-size: 1rem;
  }

  &.ProseMirror {
    outline: none;
  }
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  background-color: #f1f1f1;
  border: 1px solid #ccc;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 5px;

  button {
    background-color: transparent;
    border: none;
    color: #333;
    cursor: pointer;
    font-size: 14px;
    margin: 2px;
    padding: 5px 10px;
    border-radius: 3px;

    &:hover {
      background-color: #e1e1e1;
    }

    &.is-active {
      background-color: #d1d1d1;
    }

    &:disabled {
      color: #999;
      cursor: not-allowed;
    }
  }
}

.tiptap {
  border-top: none;
  border-radius: 0 0 4px 4px;
}
</style>