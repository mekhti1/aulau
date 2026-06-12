// Fish species common in the Caspian Sea
export const FISH_SPECIES = [
  'Осётр',
  'Севрюга',
  'Белуга',
  'Судак',
  'Сазан',
  'Вобла',
  'Сельдь',
  'Кутум',
  'Лещ',
  'Щука',
];

export const FISHING_ZONES = [
  'Зона А — Северный Каспий',
  'Зона Б — Устье р. Урал',
  'Зона В — Кигач',
  'Зона Г — Мангышлак',
  'Зона Д — Прибрежная полоса',
];

export const BATCH_STATUS_LABELS: Record<string, string> = {
  PENDING: 'На рассмотрении',
  VERIFIED: 'Проверено',
  FLAGGED: 'Подозрительно',
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  CONFIRMED: 'Подтверждён',
  CLOSED: 'Закрыт',
};

export const THREAT_LEVEL_LABELS: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
};

export const ROLE_LABELS: Record<string, string> = {
  FISHER: 'Рыбак',
  INSPECTOR: 'Инспектор',
  BUYER: 'Покупатель',
  ADMIN: 'Администратор',
};

export const ROLE_PATHS: Record<string, string> = {
  FISHER: '/fisher',
  INSPECTOR: '/inspector',
  BUYER: '/marketplace',
  ADMIN: '/admin',
};
