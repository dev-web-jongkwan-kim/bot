import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastSignal(signal: any) {
    this.server.emit('message', {
      type: 'signal',
      data: signal,
    });
  }

  broadcastPosition(position: any) {
    this.server.emit('message', {
      type: 'position',
      data: position,
    });
  }

  // 시그널 상태 업데이트 (FILLED, SKIPPED, CANCELED, FAILED)
  broadcastSignalUpdate(update: { id: number; symbol: string; status: string; error?: string }) {
    this.server.emit('message', {
      type: 'signal_update',
      data: update,
    });
  }
}
