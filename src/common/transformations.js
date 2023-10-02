// Transformations for version 1.0.0
function transformV1(data) {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const clonedItem = { ...item };
      delete clonedItem.payments;
      return clonedItem;
    });
  } else {
    const clonedData = { ...data };
    delete clonedData.payments;
    return clonedData;
  }
}

// Transformations for version 2.0.0
function transformV2(data) {
  return data;
}

module.exports = {
  "1.0.0": transformV1,
  "2.0.0": transformV2,
};
