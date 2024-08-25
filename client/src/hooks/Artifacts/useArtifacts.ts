import { useMemo, useState, useEffect, useRef } from 'react';
import { Constants } from 'librechat-data-provider';
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil';
import { useChatContext } from '~/Providers';
import { getLatestText } from '~/utils';
import store from '~/store';

export default function useArtifacts() {
  const { isSubmitting, latestMessage, conversation } = useChatContext();

  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const artifacts = useRecoilValue(store.artifactsState);
  const [currentArtifactId, setCurrentArtifactId] = useRecoilState(store.currentArtifactId);
  const resetArtifacts = useResetRecoilState(store.artifactsState);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);

  const orderedArtifactIds = useMemo(() => {
    return Object.keys(artifacts ?? {}).sort(
      (a, b) => (artifacts?.[a]?.lastUpdateTime ?? 0) - (artifacts?.[b]?.lastUpdateTime ?? 0),
    );
  }, [artifacts]);

  const lastRunMessageIdRef = useRef<string | null>(null);
  const lastContentRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);
  const hasEnclosedArtifactRef = useRef<boolean>(false);

  useEffect(() => {
    const resetState = () => {
      resetArtifacts();
      resetCurrentArtifactId();
      prevConversationIdRef.current = conversation?.conversationId ?? null;
      lastRunMessageIdRef.current = null;
      lastContentRef.current = null;
      hasEnclosedArtifactRef.current = false;
    };
    if (
      conversation &&
      conversation.conversationId !== prevConversationIdRef.current &&
      prevConversationIdRef.current != null
    ) {
      resetState();
    } else if (conversation && conversation.conversationId === Constants.NEW_CONVO) {
      resetState();
    }
    prevConversationIdRef.current = conversation?.conversationId ?? null;
  }, [conversation, resetArtifacts, resetCurrentArtifactId]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (orderedArtifactIds.length > 0) {
      const latestArtifactId = orderedArtifactIds[orderedArtifactIds.length - 1];
      setCurrentArtifactId(latestArtifactId);
    }
  }, [setCurrentArtifactId, orderedArtifactIds]);

  useEffect(() => {
    if (isSubmitting && orderedArtifactIds.length > 0 && latestMessage) {
      const latestArtifactId = orderedArtifactIds[orderedArtifactIds.length - 1];
      const latestArtifact = artifacts?.[latestArtifactId];

      if (latestArtifact?.content !== lastContentRef.current) {
        setCurrentArtifactId(latestArtifactId);
        lastContentRef.current = latestArtifact?.content ?? null;

        const latestMessageText = getLatestText(latestMessage);
        const hasEnclosedArtifact = /:::artifact[\s\S]*?(```|:::)\s*$/.test(
          latestMessageText.trim(),
        );

        if (hasEnclosedArtifact && !hasEnclosedArtifactRef.current) {
          setActiveTab('preview');
          hasEnclosedArtifactRef.current = true;
        } else {
          setActiveTab('code');
        }
      }
    }
  }, [setCurrentArtifactId, isSubmitting, orderedArtifactIds, artifacts, latestMessage]);

  useEffect(() => {
    if (latestMessage?.messageId !== lastRunMessageIdRef.current) {
      lastRunMessageIdRef.current = latestMessage?.messageId ?? null;
      hasEnclosedArtifactRef.current = false;
    }
  }, [latestMessage]);

  const currentArtifact = currentArtifactId != null ? artifacts?.[currentArtifactId] : null;

  const currentIndex = orderedArtifactIds.indexOf(currentArtifactId ?? '');
  const cycleArtifact = (direction: 'next' | 'prev') => {
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % orderedArtifactIds.length;
    } else {
      newIndex = (currentIndex - 1 + orderedArtifactIds.length) % orderedArtifactIds.length;
    }
    setCurrentArtifactId(orderedArtifactIds[newIndex]);
  };

  return {
    isVisible,
    setIsVisible,
    activeTab,
    setActiveTab,
    currentArtifact,
    currentIndex,
    cycleArtifact,
    isSubmitting,
    orderedArtifactIds,
  };
}
