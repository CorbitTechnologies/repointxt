import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const BubbleInput = ({ patterns, setPatterns, placeholder }) => {
    const { colors, borderRadius, spacing, isDark } = useTheme();
    const [inputValue, setInputValue] = useState('');

    const patternsArray = patterns
        ? patterns.split(',').map(p => p.trim()).filter(p => p !== '')
        : [];

    const addPattern = () => {
        const trimmedInput = inputValue.trim();
        if (trimmedInput && !patternsArray.includes(trimmedInput)) {
            const newPatterns = [...patternsArray, trimmedInput].join(', ');
            setPatterns(newPatterns);
            setInputValue('');
        }
    };

    const removePattern = (patternToRemove) => {
        const newPatterns = patternsArray
            .filter(p => p !== patternToRemove)
            .join(', ');
        setPatterns(newPatterns);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 6 }]}>
            <View style={styles.contentWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {patternsArray.map((pattern, index) => (
                        <View
                            key={`${pattern}-${index}`}
                            style={[styles.bubble, { backgroundColor: colors.primary, borderRadius: 4 }]}
                        >
                            <Text style={[styles.bubbleText, { color: '#fff' }]}>{pattern}</Text>
                            <TouchableOpacity onPress={() => removePattern(pattern)} style={styles.removeButton}>
                                <Icon name="x" size={10} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
                <TextInput
                    style={[styles.input, { color: colors.text, paddingHorizontal: spacing.sm }]}
                    placeholder={patternsArray.length === 0 ? placeholder : "Add pattern..."}
                    placeholderTextColor={colors.textPlaceholder}
                    value={inputValue}
                    onChangeText={(text) => {
                        if (text.endsWith(',') || text.endsWith(' ')) {
                            const val = text.slice(0, -1).trim();
                            if (val && !patternsArray.includes(val)) {
                                setPatterns([...patternsArray, val].join(', '));
                                setInputValue('');
                            } else {
                                setInputValue(text);
                            }
                        } else {
                            setInputValue(text);
                        }
                    }}
                    onSubmitEditing={addPattern}
                    blurOnSubmit={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        minHeight: 48,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    contentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 8,
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    bubbleText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    removeButton: {
        marginLeft: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: -1,
    },
    input: {
        flex: 1,
        fontSize: 14,
        minWidth: 120,
        height: 48,
        fontWeight: '600',
    },
});

export default BubbleInput;
