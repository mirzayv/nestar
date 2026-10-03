// Logger — NestJS'ning tayyor klassi, konsolga formatlangan, rangli, kontekst nomi bilan log yozish uchun ishlatiladi
import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

interface MessagePayload {
	event: string;
	text: string;
}

interface InfoPayload {
	event: string;
	totalClients: number;
}

// @WebSocketGateway decorator oddiy classni WebSocket serveriga aylantiradi; transports: ['websocket'] — faqat sof WebSocket protokolidan foydalanish; secure: false — development uchun shifrlanmagan ws:// (wss:// emas)
@WebSocketGateway({ transports: ['websocket'], secure: false })
// SocketGateway classi export qilinyapti va OnGatewayInit interfeysini "implements" qiladi — ya'ni "afterInit metodini albatta yozaman" deb va'da beradi
export class SocketGateway implements OnGatewayInit {
	// logger — private property, Logger klassidan yangi instansiya, argument sifatida 'SocketEventsGateway' nomi berilgan (bu nom har bir log yonida konsolda ko'rinadi)
	private logger: Logger = new Logger('SocketEventsGateway');
	// summaryClient — private property, tipi number, boshlang'ich qiymati 0, hozirda ulangan mijozlar sonini saqlaydi
	private summaryClient: number = 0;
	@WebSocketServer()
	server!: Server;

	// afterInit — OnGatewayInit interfeysidan kelgan metod, WebSocket server to'liq ishga tushgandan keyin NestJS uni AVTOMATIK bir marta chaqiradi (siz qo'lda chaqirmaysiz)
	public afterInit(server: Server) {
		this.logger.verbose(`WebSocket Server Initialized & total [${this.summaryClient}]`);
	}

	// handleConnection — NestJS'ning maxsus "hook" metodi: nomi aynan shunday bo'lsa, HAR SAFAR yangi mijoz ulanganda avtomatik chaqiriladi; client — ulangan mijoz obyekti, ...args — rest parameter (qolgan barcha argumentlarni massivga yig'adi, bu yerda ishlatilmagan)
	public handleConnection(client: WebSocket, ...args: any[]) {
		// hisoblagich bittaga oshiriladi (++ operatori)
		this.summaryClient++;
		this.logger.verbose(`Connection & total [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
		};
		this.emitMessage(infoMsg);
	}

	// handleDisconnect — xuddi shunday hook, lekin mijoz uzilganda chaqiriladi (brauzer yopilganda, internet uzilganda)
	public handleDisconnect(client: WebSocket) {
		// hisoblagich bittaga kamaytiriladi (-- operatori)
		this.summaryClient--;
		this.logger.verbose(`Disconnection & total [${this.summaryClient}]`);

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
		};
		this.broadcastMessage(client, infoMsg);
	}

	// @SubscribeMessage('message') decorator — NestJS'ga "mijozdan 'message' nomli xabar kelsa, aynan shu metodni chaqir" deb ko'rsatadi; bu GraphQL'dagi @Query/@Mutation'ning WebSocket dunyosidagi ekvivalenti
	@SubscribeMessage('message')
	public async handleMessage(client: WebSocket, payload: string): Promise<void> {
		const newMessage: MessagePayload = {
			event: 'message',
			text: payload,
		};

		this.logger.verbose(`NEW MESSAGE: ${payload}`);
		this.emitMessage(newMessage);
	}

	private broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
}
