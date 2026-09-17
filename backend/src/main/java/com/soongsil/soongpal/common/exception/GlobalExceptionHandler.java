package com.soongsil.soongpal.common.exception;


import com.soongsil.soongpal.common.dto.CommonErrorDto;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;


@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ChatException.class)
    public ResponseEntity<CommonErrorDto> handleChatException(ChatException e) {
        log.error("[exceptionHandle] ChatException", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()),HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(UserException.class)
    public ResponseEntity<CommonErrorDto> handleUserException(UserException e) {
        log.error("[exceptionHandle] UserException", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()), e.getErrorCode().getHttpStatus());
    }

    @ExceptionHandler(BoardException.class)
    public ResponseEntity<CommonErrorDto> handleBoardException(BoardException e) {
        log.error("[exceptionHandle] BoardException", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()), e.getErrorCode().getHttpStatus());
    }


    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<CommonErrorDto> SecurityExceptionHandler (SecurityException e) {
        log.error("[exceptionHandle] SecurityException", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()), HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<CommonErrorDto> runtimeExceptionHandler (RuntimeException e) {
        log.error("[exceptionHandle] RuntimeException", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()),HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CommonErrorDto> exceptionHandler (Exception e) {
        log.error("[exceptionHandle] Exception", e);
        return new ResponseEntity<>(new CommonErrorDto(e.getMessage()),HttpStatus.INTERNAL_SERVER_ERROR);
    }

}
