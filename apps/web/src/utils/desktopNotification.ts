export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getDesktopNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Failed to request desktop notification permission', err);
    return Notification.permission;
  }
}

export function showDesktopNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): Notification | null {
  if (!isDesktopNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/favicon.svg',
      tag: options?.tag
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      if (options?.onClick) {
        options.onClick();
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.error('Failed to show desktop notification', err);
    return null;
  }
}
