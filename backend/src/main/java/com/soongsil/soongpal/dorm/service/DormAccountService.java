package com.soongsil.soongpal.dorm.service;

import com.soongsil.soongpal.common.exception.DormErrorCode;
import com.soongsil.soongpal.common.exception.DormException;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.dorm.domain.DormAccount;
import com.soongsil.soongpal.dorm.dto.DormAccountRegisterReqDto;
import com.soongsil.soongpal.dorm.dto.DormAccountVerifyResDto;
import com.soongsil.soongpal.dorm.repository.DormAccountRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DormAccountService {

    private final DormAccountRepository dormAccountRepository;
    private final UserRepository userRepository;
    private final DormSessionManager dormSessionManager;

    /**
     * 기숙사 사이트 계정(아이디/비번)을 등록하거나, 이미 있으면 갱신함.
     * DB에는 암호화되어 저장됨 (AesCryptoConverter).
     */
    @Transactional
    public void registerOrUpdate(Long userId, DormAccountRegisterReqDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        dormAccountRepository.findByUserId(userId)
                .ifPresentOrElse(
                        existing -> existing.updateCredentials(dto.getDormUsername(), dto.getDormPassword()),
                        () -> dormAccountRepository.save(
                                new DormAccount(user, dto.getDormUsername(), dto.getDormPassword())
                        )
                );
    }

    /**
     * 등록된 계정으로 실제 기숙사 사이트 로그인이 되는지 확인.
     * 성공/실패 여부를 결과로 돌려주고, 예외를 던지지 않음 (프론트에서 바로 메시지 보여주기 좋게).
     */
    public DormAccountVerifyResDto verifyLogin(Long userId) {
        DormAccount dormAccount = dormAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new DormException(DormErrorCode.DORM_ACCOUNT_NOT_FOUND));

        try {
            dormSessionManager.login(userId, dormAccount.getDormUsername(), dormAccount.getDormPassword());
            return DormAccountVerifyResDto.ofSuccess();
        } catch (DormException e) {
            return DormAccountVerifyResDto.ofFailure(e.getMessage());
        }
    }
}
