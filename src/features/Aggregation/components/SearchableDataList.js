import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import { CustomInput } from './FormComponents';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const LIGHT_BROWN = CoffeeColors.LIGHT_BROWN;

/**
 * SearchableDataList Component
 *
 * A reusable component for displaying searchable lists of farmers or harvests
 * with autocomplete suggestions, sorting, and action buttons.
 *
 * @param {Array} records - Array of farmer or harvest records to display
 * @param {Array} fields - Field definitions for displaying record data
 * @param {String} title - Title to display at the top of the list
 * @param {Function} onExit - Callback when "Add" button is clicked
 * @param {Function} onEdit - Callback when edit button is clicked
 * @param {Function} onDelete - Callback when delete button is clicked
 * @param {Function} onSyncDraft - Callback when sync draft button is clicked
 * @param {Function} onVoucher - Callback when voucher button is clicked (harvests only)
 * @param {Boolean} isFarmer - Whether the records are farmers (true) or harvests (false)
 * @param {Array} farmersList - List of all farmers (used for harvest name lookups)
 * @param {Function} onHarvestAction - Callback when harvest ID is clicked
 */
const SearchableDataList = ({
    records = [],
    fields = [],
    title = '',
    onExit,
    onEdit,
    onDelete,
    onSyncDraft,
    onVoucher,
    isFarmer,
    farmersList = [],
    onHarvestAction,
    styles
}) => {
    const [searchText, setSearchText] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Generate autocomplete suggestions based on search text
    const suggestions = useMemo(() => {
        if (!searchText || searchText.trim() === '') {
            return [];
        }

        const safeRecords = Array.isArray(records) ? records : [];
        const lowerSearch = searchText.toLowerCase().trim();
        const suggestionSet = new Set();
        const suggestionList = [];

        safeRecords.forEach(record => {
            if (isFarmer) {
                // For farmers: suggest names and contact
                const firstName = record.first_name ? record.first_name.toLowerCase() : '';
                const lastName = record.last_name ? record.last_name.toLowerCase() : '';
                const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
                const contact = record.contact ? record.contact.toLowerCase() : '';

                // Check for matches
                if (firstName.includes(lowerSearch) || lastName.includes(lowerSearch) || contact.includes(lowerSearch)) {
                    if (fullName && !suggestionSet.has(fullName)) {
                        suggestionSet.add(fullName);
                        suggestionList.push({
                            name: fullName,
                            subtitle: contact || record.farmer_id || record.id,
                            record
                        });
                    }
                }
            } else {
                // For harvests: suggest farmer names
                const farmerUID = record.name || record.farmer_uid;
                const farmer = Array.isArray(farmersList) ? farmersList.find(f =>
                    String(f.farmer_id) === String(farmerUID) ||
                    String(f.uid) === String(farmerUID) ||
                    String(f.id) === String(farmerUID)
                ) : null;

                if (farmer) {
                    const farmerName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim();
                    const farmerNameLower = farmerName.toLowerCase();
                    if (farmerNameLower.includes(lowerSearch) && !suggestionSet.has(farmerName)) {
                        suggestionSet.add(farmerName);
                        suggestionList.push({
                            name: farmerName,
                            subtitle: `Harvest: ${record.date_of_delivery || 'N/A'}`,
                            record
                        });
                    }
                }
            }
        });

        return suggestionList.slice(0, 5); // Limit to 5 suggestions
    }, [searchText, records, isFarmer, farmersList]);

    // Filtering logic based on search text across all listed fields
    // FIXED: Ensure records is always an array to prevent .filter() errors
    // FEATURE: Sort by newest first and show last 10 records
    const filteredRecords = useMemo(() => {
        const safeRecords = Array.isArray(records) ? records : [];

        // Sort by timestamp/id (newest first) - assumes records have timestamp or id field
        const sortedRecords = [...safeRecords].sort((a, b) => {
            // Try to sort by timestamp first
            if (a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp;
            }
            // Try to sort by date_of_delivery for harvests (newest first)
            if (a.date_of_delivery && b.date_of_delivery) {
                return new Date(b.date_of_delivery) - new Date(a.date_of_delivery);
            }
            // Try to sort by created_at or updated_at
            if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            if (a.updated_at && b.updated_at) {
                return new Date(b.updated_at) - new Date(a.updated_at);
            }
            // Fallback: sort by ID (assuming higher ID = newer)
            if (a.id && b.id) {
                return String(b.id).localeCompare(String(a.id));
            }
            return 0;
        });

        // If no search text, return first 10 records (newest)
        if (!searchText || searchText.trim() === '') {
            return sortedRecords.slice(0, 10);
        }

        // If searching, filter and return up to 10 matching records
        const lowerSearch = searchText.toLowerCase().trim();
        const filtered = sortedRecords.filter(record => {
            // For farmers: search in first_name, last_name, contact, district, farmer_id, uid
            if (isFarmer) {
                const searchableText = [
                    record.first_name,
                    record.last_name,
                    `${record.first_name} ${record.last_name}`,
                    record.contact,
                    record.district,
                    record.farmer_id,
                    record.uid,
                    record.id
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(lowerSearch);
            } else {
                // For harvests: search in farmer UID and lookup farmer name
                const farmerUID = record.name || record.farmer_uid;
                const farmer = Array.isArray(farmersList) ? farmersList.find(f =>
                    String(f.farmer_id) === String(farmerUID) ||
                    String(f.uid) === String(farmerUID) ||
                    String(f.id) === String(farmerUID)
                ) : null;

                const farmerName = farmer ? `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() : '';
                const searchableText = [
                    farmerName,
                    farmerUID,
                    record.id,
                    record.date_of_delivery,
                    record.paid_by
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(lowerSearch);
            }
        });

        return filtered.slice(0, 10);
    }, [records, fields, searchText, isFarmer, farmersList]);

    // Renders the summary row for the FlatList
    const renderItem = ({ item }) => {
        // For farmers: compute name from first_name + last_name if 'name' field doesn't exist
        // For harvests: lookup farmer name from farmersList using the UID/name field
        let displayName = 'N/A';
        let displayId = 'No ID';

        if (isFarmer) {
            // Farmer record - construct name from first_name and last_name
            displayName = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A';
            displayId = item.uid || item.farmer_id || item.id || 'No ID';
        } else {
            // Harvest record - lookup farmer name and ID from the farmers list
            // Django returns farmer UID in the 'name' field, so we need to find the actual farmer
            const farmerUID = item.name || item.farmer_name || item.farmer_uid;
            if (farmerUID && Array.isArray(farmersList)) {
                // Try to find the farmer in the farmers list
                const farmer = farmersList.find(f => {
                    // Construct full name from farmer record
                    const farmerFullName = `${f.first_name || ''} ${f.last_name || ''}`.trim();

                    return (
                        String(f.farmer_id) === String(farmerUID) ||
                        String(f.uid) === String(farmerUID) ||
                        String(f.id) === String(farmerUID) ||
                        farmerFullName === String(farmerUID)  // Match by full name
                    );
                });

                if (farmer) {
                    displayName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.name || farmerUID;
                } else {
                    // Farmer not found in list, just show the UID
                    displayName = farmerUID;
                }
            } else {
                displayName = farmerUID || 'N/A';
            }
            // For harvest records, always display the harvest ID (not farmer ID)
            displayId = item.harvest_id || item.id || 'No ID';
        }

        const secondKey = fields.length > 1 ? fields[1].key : null;
        const thirdKey = fields.length > 2 ? fields[2].key : null;

        // Check if this is a harvest record (not a farmer record)
        const isHarvest = !isFarmer;

        return (
            <View style={[styles.dataListItem, item._isDraft && styles.draftListItem, !item._isDraft && !item._isSynced && styles.pendingListItem]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => onEdit(item)} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={styles.dataListItemTitle}>
                                {String(displayName)}
                            </Text>
                            {isHarvest ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        console.log('[SearchableDataList] Harvest ID tapped:', displayId);
                                        if (onHarvestAction) {
                                            onHarvestAction(item);
                                        }
                                    }}
                                    style={styles.harvestIdButton}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.dataListItemUID}> ({displayId})</Text>
                                    <Ionicons name="chevron-down-circle" size={16} color={PRIMARY_BROWN} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.dataListItemUID}> ({displayId})</Text>
                            )}
                        </View>
                        {/* Draft Badge - Shows only for incomplete draft records */}
                        {item._isDraft && (
                            <View style={styles.draftBadge}>
                                <Text style={styles.draftBadgeText}>DRAFT</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.dataListItemSubtitle}>
                        {secondKey ? `${fields[1].label}: ${item[secondKey] || 'N/A'}` : ''}
                        {thirdKey ? ` | ${fields[2].label}: ${item[thirdKey] || 'N/A'}` : ''}
                    </Text>
                    {/* Show draft step if it's a draft */}
                    {item._isDraft && (
                        <Text style={styles.draftStepText}>
                            Saved at: {item._draftStepTitle || 'Unknown Step'}
                        </Text>
                    )}
                    {/* Pending Status - Shows for submitted but unsynced records */}
                    {!item._isDraft && !item._isSynced && (
                        <View style={styles.syncStatusInline}>
                            <Ionicons name="cloud-upload-outline" size={14} color={LIGHT_BROWN} />
                            <Text style={[styles.syncStatusText, { color: LIGHT_BROWN }]}>Pending</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Edit, Sync Draft (if draft), Voucher (for harvests), and Delete Icon Buttons */}
                <View style={styles.recordActions}>
                    {/* Sync Draft Button - Only shows for draft records */}
                    {item._isDraft && onSyncDraft && (
                        <TouchableOpacity
                            style={[styles.iconButton, styles.syncButton]}
                            onPress={() => {
                                onSyncDraft(item); // Sync draft to database
                            }}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                    )}

                    {/* Voucher Button - Only shows for harvest records */}
                    {!isFarmer && onVoucher && (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                                onVoucher(item);
                            }}
                        >
                            <Ionicons name="document-text" size={20} color={PRIMARY_BROWN} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            onEdit(item, true); // Pass true to indicate edit mode vs view mode
                        }}
                    >
                        <Ionicons name="pencil" size={20} color={PRIMARY_BROWN} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            onDelete(item);
                        }}
                    >
                        <Ionicons name="trash" size={20} color={'#d32f2f' || '#d32f2f'} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.recordsContainer}>
            <View style={styles.tableHeaderSection}>
                <Text style={styles.tableTitle}>{title}</Text>

                {/* Search field with autocomplete suggestions */}
                <View style={{ position: 'relative', zIndex: 100 }}>
                    <View style={styles.searchContainer}>
                        <View style={{ flex: 1 }}>
                            <CustomInput
                                placeholder="Search by name, ID, or contact..."
                                value={searchText}
                                onChangeText={(text) => {
                                    setSearchText(text);
                                    setShowSuggestions(text.trim().length > 0 && suggestions.length > 0);
                                }}
                                onFocus={() => {
                                    setShowSuggestions(searchText.trim().length > 0 && suggestions.length > 0);
                                }}
                                onBlur={() => {
                                    // Delay hiding to allow selection
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
                                styles={styles}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => {/* Search is automatic via useMemo */}}
                        >
                            <Ionicons name="search" size={22} color={'#fff'} />
                        </TouchableOpacity>
                    </View>

                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={[styles.suggestionsDropdown, { maxHeight: 250 }]}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item, index) => `${item.name}-${index}`}
                                scrollEnabled={suggestions.length > 4}
                                nestedScrollEnabled={true}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => {
                                            setSearchText(item.name);
                                            setShowSuggestions(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.suggestionName}>{item.name}</Text>
                                            <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>
                                        </View>
                                        <Ionicons name="arrow-forward" size={16} color={PRIMARY_BROWN} />
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: PRIMARY_BROWN, flex: 1, marginRight: 8 }]}
                        onPress={onExit}
                    >
                        <Ionicons name="add-circle" size={20} color={CoffeeColors.CREAM} style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Add {isFarmer ? 'Farmer' : 'Harvest'}</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.recordCount}>{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</Text>
                    </View>
                </View>
            </View>

            {filteredRecords.length > 0 ? (
                <FlatList
                    data={filteredRecords}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || item.uid || index.toString()}
                    style={styles.listContainer}
                />
            ) : (
                <Text style={styles.noRecords}>No records found matching your search.</Text>
            )}
        </View>
    );
};

export default SearchableDataList;
