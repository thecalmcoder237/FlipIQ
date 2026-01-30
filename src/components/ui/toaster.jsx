import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, action, dismiss, duration, ...props }) => {
				// #region agent log
				fetch('http://127.0.0.1:7245/ingest/d3874b50-fda2-4990-b7a4-de8818f92f9c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toaster.jsx:Toaster',message:'toast render',data:{id,propsKeys:Object.keys(props),dismissDestructured:typeof dismiss},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
				// #endregion
				return (
					<Toast key={id} {...props}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && (
								<ToastDescription>{description}</ToastDescription>
							)}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}