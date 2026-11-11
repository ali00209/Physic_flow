import { useEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

/**
 * Text fields that keep what you type in local state. The stored value is copied in only while the
 * field is not focused, so typing never waits for the graph store and the caret never jumps.
 */
function useDraft(value: string, onCommit: (v: string) => void) {
	const [draft, setDraft] = useState(value)
	const editing = useRef(false)
	useEffect(() => {
		if (!editing.current) setDraft(value)
	}, [value])
	return {
		value: draft,
		onFocus: () => {
			editing.current = true
		},
		onBlur: () => {
			editing.current = false
			setDraft(value)
		},
		onChange: (e: { target: { value: string } }) => {
			setDraft(e.target.value)
			onCommit(e.target.value)
		},
	}
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
	value: string
	onCommit: (v: string) => void
}

export function DraftInput({ value, onCommit, ...rest }: InputProps) {
	const d = useDraft(value, onCommit)
	return <input {...rest} {...d} />
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
	value: string
	onCommit: (v: string) => void
}

export function DraftTextArea({ value, onCommit, ...rest }: TextAreaProps) {
	const d = useDraft(value, onCommit)
	return <textarea {...rest} {...d} />
}
