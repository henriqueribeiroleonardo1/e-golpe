/**
 * Roda o bot do Telegram sem servidor público: o próprio bot pergunta ao Telegram
 * se chegou mensagem nova. Ideal para testar no seu computador.
 */
import { createServices, loadDotEnv } from './bootstrap.js';
import type { TelegramUpdate } from './channels/telegram.js';
import { loadConfig } from './config.js';

loadDotEnv();
const { telegram } = createServices(loadConfig());

if (!telegram) {
  console.error('Defina TELEGRAM_BOT_TOKEN no arquivo .env (crie o bot com o @BotFather).');
  process.exit(1);
}

await telegram.call('deleteWebhook');
const me = await telegram.call<{ username: string }>('getMe');
console.log(`Bot @${me.username} rodando. Mande uma mensagem para ele no Telegram. (Ctrl+C para sair)`);

let offset = 0;
while (true) {
  try {
    const updates = await telegram.call<TelegramUpdate[]>('getUpdates', { offset, timeout: 30 });
    for (const update of updates) {
      offset = update.update_id + 1;
      await telegram
        .handleUpdate(update)
        .catch((error: Error) => console.error(`Falha ao responder: ${error.message}`));
    }
  } catch (error) {
    console.error(`Sem conexão com o Telegram (${(error as Error).message}). Tentando de novo em 5s.`);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
