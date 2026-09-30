package com.soongsil.soongpal.chat.dto;

/** 누군가 메시지를 읽음 처리했을 때 실시간으로 알려주는 소켓 이벤트 payload. /topic/{roomId}/read 로 발행됨. */
public record ChatReadReceiptDto(Long roomId, Long readerId, Long lastReadMessageId) {
}
