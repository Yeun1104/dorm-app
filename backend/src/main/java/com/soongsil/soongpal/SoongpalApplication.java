package com.soongsil.soongpal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // 기숙사 공지사항 알림 스케줄러(매일 9/12/18시) 등 @Scheduled 사용을 위해 켜둠
public class SoongpalApplication {

	public static void main(String[] args) {
		SpringApplication.run(SoongpalApplication.class, args);
	}

}
