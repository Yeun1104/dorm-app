package com.soongsil.soongpal.common.file;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class S3Uploader {

    // S3 기능이 꺼져있으면(app.feature.s3.enabled=false) S3Client 빈이 아예 없음.
    // Optional로 받아서 없으면 업로드/삭제를 조용히 스킵 (게시글 작성 자체는 막지 않음, 이미지만 안 붙음).
    private final Optional<S3Client> s3ClientProvider;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.region.static}")
    private String region;

    public String uploadFile(MultipartFile multipartFile, String dirName) {
        if (multipartFile.isEmpty()) {
            return null;
        }

        if (s3ClientProvider.isEmpty()) {
            log.warn("S3 비활성화 상태 - 이미지 업로드 스킵 (dirName={}, 파일명={})", dirName, multipartFile.getOriginalFilename());
            return null;
        }

        // 고유한 파일명 생성 (UUID 사용)
        String originalFilename = multipartFile.getOriginalFilename();
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String fileName = dirName + "/" + UUID.randomUUID().toString() + fileExtension;

        try {
            // S3 PutObjectRequest 생성
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(fileName)
                    .contentType(multipartFile.getContentType())
                    .contentLength(multipartFile.getSize())
                    .build();

            // 파일 스트림을 S3에 업로드
            s3ClientProvider.get().putObject(putObjectRequest, RequestBody.fromInputStream(multipartFile.getInputStream(), multipartFile.getSize()));

            // 업로드된 파일의 S3 URL 반환
            return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + fileName;

        } catch (S3Exception | IOException e) {
            log.error("S3 파일 업로드 실패: {}", e.getMessage());
            throw new RuntimeException("S3 파일 업로드 실패", e);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        if (s3ClientProvider.isEmpty()) {
            log.warn("S3 비활성화 상태 - 이미지 삭제 스킵 ({})", fileUrl);
            return;
        }

        String key = fileUrl.substring(fileUrl.indexOf(".com/") + 5);

        try {
            // S3 DeleteObjectRequest 생성
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            // S3에서 파일 삭제 실행
            s3ClientProvider.get().deleteObject(deleteObjectRequest);
            log.info("S3 파일 삭제 성공: {}", key);
        } catch (S3Exception e) {
            log.error("S3 파일 삭제 실패: {}", e.getMessage());
            throw new RuntimeException("S3 파일 삭제 실패", e);
        }
    }
}
