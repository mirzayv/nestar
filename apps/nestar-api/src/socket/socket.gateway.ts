// Logger — NestJS'ning tayyor klassi, konsolga formatlangan, rangli, kontekst nomi bilan log yozish uchun ishlatiladi
import { Logger } from '@nestjs/common';
// uchta narsa @nestjs/websockets paketidan olinyapti: OnGatewayInit — interfeys (shartnoma), SubscribeMessage — decorator, WebSocketGateway — asosiy decorator
import { OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
// Server — 'ws' kutubxonasining server tipi, faqat TypeScript tip tekshiruvi uchun kerak, ishga ta'sir qilmaydi
import { Server } from 'ws';

// @WebSocketGateway decorator oddiy classni WebSocket serveriga aylantiradi; transports: ['websocket'] — faqat sof WebSocket protokolidan foydalanish; secure: false — development uchun shifrlanmagan ws:// (wss:// emas)
@WebSocketGateway({ transports: ['websocket'], secure: false })
// SocketGateway classi export qilinyapti va OnGatewayInit interfeysini "implements" qiladi — ya'ni "afterInit metodini albatta yozaman" deb va'da beradi
export class SocketGateway implements OnGatewayInit {
	// logger — private property, Logger klassidan yangi instansiya, argument sifatida 'SocketEventsGateway' nomi berilgan (bu nom har bir log yonida konsolda ko'rinadi)
	private logger: Logger = new Logger('SocketEventsGateway');
	// summaryClient — private property, tipi number, boshlang'ich qiymati 0, hozirda ulangan mijozlar sonini saqlaydi
	private summaryClient: number = 0;

	// afterInit — OnGatewayInit interfeysidan kelgan metod, WebSocket server to'liq ishga tushgandan keyin NestJS uni AVTOMATIK bir marta chaqiradi (siz qo'lda chaqirmaysiz)
	public afterInit(server: Server) {
		// this.logger.log(...) chaqirilib, template literal (teskari qo'shtirnoq) ichida ${this.summaryClient} qiymati matnga qo'shiladi
		this.logger.log(`WebSocket Server Initialized total:${this.summaryClient}`);
	}

	// handleConnection — NestJS'ning maxsus "hook" metodi: nomi aynan shunday bo'lsa, HAR SAFAR yangi mijoz ulanganda avtomatik chaqiriladi; client — ulangan mijoz obyekti, ...args — rest parameter (qolgan barcha argumentlarni massivga yig'adi, bu yerda ishlatilmagan)
	public handleConnection(client: WebSocket, ...args: any[]) {
		// hisoblagich bittaga oshiriladi (++ operatori)
		this.summaryClient++;
		// yangi holat konsolga yoziladi
		this.logger.log(`== Client connected total:${this.summaryClient} ==`);
	}

	// handleDisconnect — xuddi shunday hook, lekin mijoz uzilganda chaqiriladi (brauzer yopilganda, internet uzilganda)
	public handleDisconnect(client: WebSocket) {
		// hisoblagich bittaga kamaytiriladi (-- operatori)
		this.summaryClient--;
		this.logger.log(`== Client disconnected total:${this.summaryClient} ==`);
	}

	// @SubscribeMessage('message') decorator — NestJS'ga "mijozdan 'message' nomli xabar kelsa, aynan shu metodni chaqir" deb ko'rsatadi; bu GraphQL'dagi @Query/@Mutation'ning WebSocket dunyosidagi ekvivalenti
	@SubscribeMessage('message')
	// handleMessage — ikkita parametr: client (kim yubordi) va payload (nima yubordi, tipi any — istalgan turdagi ma'lumot); string qaytaradi
	public handleMessage(client: WebSocket, payload: any): string {
		// qaytgan qiymat AVTOMATIK ravishda mijozga javob sifatida yuboriladi; hozircha bu test uchun oddiy matn
		return 'Hello world!';
	}
}
