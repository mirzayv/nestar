// Module decorator-funksiyasi @nestjs/common paketidan import qilinyapti
import { Module } from '@nestjs/common';
// SocketGateway classi qo'shni fayldan import qilinyapti
import { SocketGateway } from './socket.gateway';

// @Module decorator classni NestJS moduliga aylantiradi
@Module({
	// providers massivida faqat SocketGateway — bu NestJS'ga "shu classni instantiate qilib, dependency injection uchun tayyorla" deyish
	providers: [SocketGateway],
	// DIQQAT: bu yerda exports YO'Q — chunki SocketGateway'ni boshqa hech qanday modul "qarz olishi" kerak emas, u mustaqil ishlaydi
})
// SocketModule classi export qilinyapti, tanasi bo'sh — barcha konfiguratsiya decorator ichida
export class SocketModule {}
