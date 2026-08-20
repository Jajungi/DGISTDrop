import AsyncStorage from '@react-native-async-storage/async-storage';

function optedOutKey(userId: string) {
  return `@badmin/push-opted-out:${userId}`;
}

export async function isPushOptedOut(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(optedOutKey(userId));
  return raw === '1';
}

export async function setPushOptedOut(userId: string, optedOut: boolean): Promise<void> {
  if (optedOut) {
    await AsyncStorage.setItem(optedOutKey(userId), '1');
  } else {
    await AsyncStorage.removeItem(optedOutKey(userId));
  }
}
