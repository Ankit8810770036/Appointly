import { toast as sonnerToast } from 'sonner';
import { sound } from './sound';

export const toast = {
    success: (message, options) => {
        sound.success();
        return sonnerToast.success(message, options);
    },
    error: (message, options) => {
        sound.error();
        return sonnerToast.error(message, options);
    },
    info: (message, options) => {
        sound.notification();
        return sonnerToast.info(message, options);
    },
    warning: (message, options) => {
        sound.notification();
        return sonnerToast.warning(message, options);
    },
    message: (message, options) => {
        sound.message();
        return sonnerToast.message(message, options);
    },
    loading: (message, options) => {
        return sonnerToast.loading(message, options);
    },
    promise: (promise, options) => {
        return sonnerToast.promise(promise, options);
    },
    dismiss: (id) => sonnerToast.dismiss(id),
    custom: (jsx, options) => {
        sound.notification();
        return sonnerToast.custom(jsx, options);
    }
};
